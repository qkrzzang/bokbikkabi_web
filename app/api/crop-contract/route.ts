import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ENCRYPTION_KEY = process.env.CONTRACT_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 32) || 'default-32-byte-encryption-key!!'

/**
 * AES-256-CBC 암호화
 */
function encryptBuffer(buffer: Buffer): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8')
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('hex'),
  }
}

// ===== 이미지 방향 감지 =====

type Orientation = 0 | 90 | 180 | 270

interface OfficePosition {
  orientation: Orientation
  minX: number
  maxX: number
  minY: number
  maxY: number
  ocrWidth: number
  ocrHeight: number
}

/**
 * OCR bounding box vertices로 텍스트 방향(기울기) 감지
 * 
 * vertices[0] → vertices[1] 벡터의 각도로 판단:
 *   0°   : 텍스트가 왼→오 (정상)
 *   90°  : 텍스트가 위→아래 (시계방향 회전, 문서 하단이 이미지 왼쪽)
 *   180° : 텍스트가 오→왼 (뒤집힘)
 *   270° : 텍스트가 아래→위 (반시계방향 회전, 문서 하단이 이미지 오른쪽)
 */
function detectOrientation(vertices: Array<{ x: number; y: number }>): Orientation {
  if (!vertices || vertices.length < 2) return 0

  const dx = (vertices[1].x || 0) - (vertices[0].x || 0)
  const dy = (vertices[1].y || 0) - (vertices[0].y || 0)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) // -180 ~ 180

  if (angle >= -45 && angle < 45) return 0
  if (angle >= 45 && angle < 135) return 90
  if (angle >= -135 && angle < -45) return 270
  return 180
}

/**
 * 크롭 키워드 우선순위 (OCR 텍스트에서 자동 판단)
 *   1순위: '공인중개사' (표준 계약서 - STANDARD)
 *   2순위: '사무소'     (일반 계약서 - GENERAL)
 *
 * contractType이 명시적으로 전달되면 해당 키워드만 검색,
 * 전달되지 않으면 1순위 → 2순위 순으로 자동 탐색
 */
const CROP_KEYWORDS = [
  { keyword: '공인중개사', type: 'STANDARD' },
  { keyword: '사무소', type: 'GENERAL' },
]

/**
 * OCR 결과에서 크롭 기준 텍스트 위치 + 이미지 방향 감지
 *
 * 계약서 구조: 상단(계약 내용) → 하단(중개사무소 정보, 인감)
 * 방향에 따라 '하단'이 이미지의 어느 쪽에 위치하는지 달라짐:
 *   0°   → 이미지 하단 (Y > 30%)
 *   90°  → 이미지 좌측 (X < 70%)
 *   180° → 이미지 상단 (Y < 70%)
 *   270° → 이미지 우측 (X > 30%)
 *
 * contractType 전달 시 해당 키워드만 검색,
 * 미전달 시 '공인중개사' → '사무소' 순으로 자동 탐색
 */
function findOfficePosition(ocrResult: any, contractType?: string): (OfficePosition & { matchedKeyword: string }) | null {
  const pages = ocrResult?.pages
  if (!pages || pages.length === 0) return null

  const page = pages[0]
  const ocrHeight = page.height || 1
  const ocrWidth = page.width || 1
  const words = page.words || []

  // contractType이 명시되면 해당 키워드만, 아니면 우선순위 순으로 모두 시도
  const keywordsToSearch = contractType
    ? CROP_KEYWORDS.filter(k => k.type === contractType)
    : CROP_KEYWORDS

  console.log(`[crop] 검색 키워드: [${keywordsToSearch.map(k => k.keyword).join(', ')}] (contractType=${contractType || '자동'})`)

  for (const { keyword } of keywordsToSearch) {
    for (const word of words) {
      const text = word.text || ''
      if (text.includes(keyword)) {
        const vertices = word.boundingBox?.vertices
        if (!vertices || vertices.length < 4) continue

        const orientation = detectOrientation(vertices)

        const xs = vertices.map((v: any) => v.x || 0)
        const ys = vertices.map((v: any) => v.y || 0)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        // 방향에 따라 문서 하단부(중개사 정보 영역)에 위치하는지 확인
        let isInAgentSection = false
        switch (orientation) {
          case 0:   isInAgentSection = minY > ocrHeight * 0.3; break
          case 90:  isInAgentSection = maxX < ocrWidth * 0.7; break
          case 180: isInAgentSection = maxY < ocrHeight * 0.7; break
          case 270: isInAgentSection = minX > ocrWidth * 0.3; break
        }

        if (isInAgentSection) {
          console.log(`[crop] 타겟 발견: '${text}' (키워드:'${keyword}', 방향:${orientation}°, X:${minX}~${maxX}, Y:${minY}~${maxY}, OCR:${ocrWidth}x${ocrHeight})`)
          return { orientation, minX, maxX, minY, maxY, ocrWidth, ocrHeight, matchedKeyword: keyword }
        }
      }
    }
  }

  return null
}

// ===== API =====

/**
 * 계약서 이미지 크롭 + 암호화 API
 *
 * 방향별 크롭 전략:
 *   0°   : 사무소 Y좌표 → 이미지 하단 (기존 동작)
 *   90°  : 이미지 왼쪽 끝 → 사무소 X좌표
 *   180° : 이미지 상단 → 사무소 Y좌표
 *   270° : 사무소 X좌표 → 이미지 오른쪽 끝
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, ocrResult, contractType } = body

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지 데이터가 필요합니다.' }, { status: 400 })
    }

    // base64 → Buffer
    const buffer = Buffer.from(imageBase64, 'base64')

    console.log(`[crop] 이미지 수신: ${(buffer.length / 1024).toFixed(1)}KB, contractType=${contractType || 'GENERAL'}`)

    // 1. OCR 결과에서 크롭 기준 텍스트 위치 + 방향 감지
    //    STANDARD → '공인중개사' 검색 / GENERAL → '사무소' 검색
    const officePos = ocrResult ? findOfficePosition(ocrResult, contractType) : null

    // 2. EXIF 회전 보정
    const rotatedBuffer = await sharp(buffer).rotate().toBuffer()
    const metadata = await sharp(rotatedBuffer).metadata()
    const imgWidth = metadata.width || 1
    const imgHeight = metadata.height || 1

    console.log(`[crop] 이미지 크기: ${imgWidth}x${imgHeight}`)

    let imageToEncrypt: Buffer

    if (officePos) {
      const { orientation, minX, maxX, minY, maxY, ocrWidth, ocrHeight: ocrH } = officePos

      let extractLeft = 0
      let extractTop = 0
      let extractWidth = imgWidth
      let extractHeight = imgHeight

      switch (orientation) {
        case 0: {
          // 정상 (0°): 사무소 Y좌표부터 이미지 하단까지
          const ratioY = imgHeight / ocrH
          extractTop = Math.max(0, Math.floor(minY * ratioY) - 10)
          extractHeight = imgHeight - extractTop
          console.log(`[crop] 0° 크롭: Y=${extractTop}px → 하단 (H=${extractHeight}px)`)
          break
        }
        case 90: {
          // 90° 회전: 이미지 왼쪽 끝(x=0)부터 사무소 X좌표까지
          const ratioX = imgWidth / ocrWidth
          extractLeft = 0
          extractWidth = Math.min(Math.floor(maxX * ratioX) + 10, imgWidth)
          console.log(`[crop] 90° 크롭: 좌측 끝 → X=${extractWidth}px (W=${extractWidth}px)`)
          break
        }
        case 180: {
          // 180° 뒤집힘: 이미지 상단(y=0)부터 사무소 Y좌표까지
          const ratioY = imgHeight / ocrH
          extractTop = 0
          extractHeight = Math.min(Math.floor(maxY * ratioY) + 10, imgHeight)
          console.log(`[crop] 180° 크롭: 상단 → Y=${extractHeight}px (H=${extractHeight}px)`)
          break
        }
        case 270: {
          // 270° 회전: 사무소 X좌표부터 이미지 오른쪽 끝까지
          const ratioX = imgWidth / ocrWidth
          extractLeft = Math.max(0, Math.floor(minX * ratioX) - 10)
          extractWidth = imgWidth - extractLeft
          console.log(`[crop] 270° 크롭: X=${extractLeft}px → 우측 끝 (W=${extractWidth}px)`)
          break
        }
      }

      // 안전 검증
      if (extractTop >= imgHeight) extractTop = 0
      if (extractLeft >= imgWidth) extractLeft = 0
      extractHeight = Math.min(extractHeight, imgHeight - extractTop)
      extractWidth = Math.min(extractWidth, imgWidth - extractLeft)
      if (extractHeight <= 0) extractHeight = imgHeight
      if (extractWidth <= 0) extractWidth = imgWidth

      console.log(`[crop] 최종: left=${extractLeft}, top=${extractTop}, W=${extractWidth}, H=${extractHeight}`)

      imageToEncrypt = await sharp(rotatedBuffer)
        .extract({
          left: extractLeft,
          top: extractTop,
          width: extractWidth,
          height: extractHeight,
        })
        .jpeg({ quality: 80 })
        .toBuffer()
    } else {
      console.log(`[crop] 크롭 키워드 미발견 → 원본 이미지를 축소하여 암호화`)
      imageToEncrypt = await sharp(rotatedBuffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer()
    }

    console.log(`[crop] 크롭 결과: ${(imageToEncrypt.length / 1024).toFixed(1)}KB`)

    // 3. 암호화
    const { encrypted, iv } = encryptBuffer(imageToEncrypt)

    return NextResponse.json({
      success: true,
      cropped: officePos !== null,
      orientation: officePos?.orientation ?? 0,
      matchedKeyword: officePos?.matchedKeyword ?? null,
      encrypted,
      iv,
      originalSize: buffer.length,
      croppedSize: imageToEncrypt.length,
    })
  } catch (error: any) {
    console.error('[crop] 오류:', error.message)
    return NextResponse.json(
      { error: '이미지 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
