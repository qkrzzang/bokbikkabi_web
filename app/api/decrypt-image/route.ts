import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const ENCRYPTION_KEY = process.env.CONTRACT_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 32) || 'default-32-byte-encryption-key!!'

export async function POST(request: NextRequest) {
  try {
    const { encrypted, iv } = await request.json()

    if (!encrypted || !iv) {
      return NextResponse.json({ error: '암호화 데이터가 필요합니다.' }, { status: 400 })
    }

    const ivBuffer = Buffer.from(iv, 'hex')
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer)
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ])

    // JPEG 이미지를 data URL로 반환
    const base64Image = `data:image/jpeg;base64,${decrypted.toString('base64')}`

    return NextResponse.json({ success: true, imageUrl: base64Image })
  } catch (error: any) {
    console.error('[decrypt] 오류:', error.message)
    return NextResponse.json(
      { error: '이미지 복호화에 실패했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
