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

/**
 * OCR 결과에서 '사무소' 텍스트 Y좌표 찾기
 */
function findOfficeY(ocrResult: any): { targetY: number; ocrHeight: number } | null {
  const pages = ocrResult?.pages
  if (!pages || pages.length === 0) return null

  const page = pages[0]
  const ocrHeight = page.height || 1
  const words = page.words || []

  for (const word of words) {
    const text = word.text || ''
    if (text.includes('사무소')) {
      const vertices = word.boundingBox?.vertices
      if (!vertices || vertices.length === 0) continue

      const yCoord = vertices[0].y
      // 문서 높이의 40% 이후에 있는 '사무소'만 대상
      if (yCoord > ocrHeight * 0.4) {
        console.log(`[crop] 타겟 발견: '${text}' (Y좌표: ${yCoord}, 높이: ${ocrHeight})`)
        return { targetY: yCoord, ocrHeight }
      }
    }
  }

  return null
}

/**
 * 계약서 이미지 크롭 + 암호화 API
 * 
 * body: { imageBase64: string, ocrResult: object }
 * - imageBase64: 원본 이미지의 base64 문자열
 * - ocrResult: /api/ocr에서 이미 받은 OCR 결과 (재사용하여 API 호출 절약)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, ocrResult } = body

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지 데이터가 필요합니다.' }, { status: 400 })
    }

    // base64 → Buffer
    const buffer = Buffer.from(imageBase64, 'base64')

    console.log(`[crop] 이미지 수신: ${(buffer.length / 1024).toFixed(1)}KB`)

    // 1. OCR 결과에서 '사무소' 위치 찾기 (OCR 결과를 클라이언트에서 전달받음)
    const officePos = ocrResult ? findOfficeY(ocrResult) : null

    // 2. sharp로 이미지 처리 - 먼저 EXIF 회전 보정된 버퍼를 확정
    const rotatedBuffer = await sharp(buffer).rotate().toBuffer()
    const metadata = await sharp(rotatedBuffer).metadata()
    const imgWidth = metadata.width || 1
    const imgHeight = metadata.height || 1

    let imageToEncrypt: Buffer

    if (officePos) {
      // OCR 좌표 → 실제 픽셀 좌표 비율 계산
      const ratio = imgHeight / officePos.ocrHeight
      let cropStartY = Math.max(0, Math.floor(officePos.targetY * ratio) - 10)
      const cropHeight = imgHeight - cropStartY

      // 안전 검증
      if (cropStartY >= imgHeight) cropStartY = 0
      const safeCropHeight = Math.min(cropHeight, imgHeight - cropStartY)

      console.log(`[crop] 크롭: Y=${cropStartY}px, H=${safeCropHeight}px (이미지: ${imgWidth}x${imgHeight}, 비율: ${ratio.toFixed(2)})`)

      imageToEncrypt = await sharp(rotatedBuffer)
        .extract({
          left: 0,
          top: cropStartY,
          width: imgWidth,
          height: safeCropHeight,
        })
        .jpeg({ quality: 80 })
        .toBuffer()
    } else {
      console.log(`[crop] '사무소' 미발견 → 원본 이미지를 축소하여 암호화`)
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
