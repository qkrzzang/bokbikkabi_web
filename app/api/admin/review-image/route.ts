import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ENCRYPTION_KEY = process.env.CONTRACT_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 32) || 'default-32-byte-encryption-key!!'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

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
 * PUT: 관리자 이미지 수정 (새 이미지 업로드 → 암호화하여 DB 업데이트)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviewId, imageBase64 } = body

    if (!reviewId || !imageBase64) {
      return NextResponse.json({ error: '리뷰 ID와 이미지 데이터가 필요합니다.' }, { status: 400 })
    }

    // base64 → Buffer
    const buffer = Buffer.from(imageBase64, 'base64')

    // 이미지 처리: EXIF 회전 보정 + 리사이즈 + 압축
    const processedBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()

    console.log(`[admin/review-image] 이미지 처리: ${(buffer.length / 1024).toFixed(1)}KB → ${(processedBuffer.length / 1024).toFixed(1)}KB`)

    // 암호화
    const { encrypted, iv } = encryptBuffer(processedBuffer)

    // DB 업데이트
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('agent_reviews')
      .update({
        contract_image_encrypted: encrypted,
        contract_image_iv: iv,
      })
      .eq('id', reviewId)

    if (error) {
      console.error('[admin/review-image] DB 업데이트 오류:', error)
      return NextResponse.json({ error: 'DB 업데이트 실패', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '이미지가 수정되었습니다.',
      size: processedBuffer.length,
    })
  } catch (error: any) {
    console.error('[admin/review-image] PUT 오류:', error.message)
    return NextResponse.json({ error: '이미지 수정 실패', details: error.message }, { status: 500 })
  }
}

/**
 * DELETE: 관리자 이미지 삭제 (DB에서 암호화 데이터 제거)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json({ error: '리뷰 ID가 필요합니다.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('agent_reviews')
      .update({
        contract_image_encrypted: null,
        contract_image_iv: null,
      })
      .eq('id', reviewId)

    if (error) {
      console.error('[admin/review-image] DB 삭제 오류:', error)
      return NextResponse.json({ error: 'DB 업데이트 실패', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '이미지가 삭제되었습니다.',
    })
  } catch (error: any) {
    console.error('[admin/review-image] DELETE 오류:', error.message)
    return NextResponse.json({ error: '이미지 삭제 실패', details: error.message }, { status: 500 })
  }
}
