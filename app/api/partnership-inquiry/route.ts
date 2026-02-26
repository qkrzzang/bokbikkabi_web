import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.CONTRACT_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 32) || 'default-32-byte-encryption-key!!'

function encryptText(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8')
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('base64')
}

function decryptText(encryptedText: string): string {
  try {
    const [ivHex, data] = encryptedText.split(':')
    if (!ivHex || !data) return encryptedText
    const iv = Buffer.from(ivHex, 'hex')
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()])
    return decrypted.toString('utf-8')
  } catch {
    return encryptedText
  }
}

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supabase_user_id, user_email, user_name, company_name, contact_phone, inquiry_type, title, content, imageBase64 } = body

    if (!supabase_user_id || !inquiry_type || !title || !content) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    const encryptedPhone = contact_phone ? encryptText(contact_phone) : null

    let image_encrypted: string | null = null
    let image_iv: string | null = null

    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const result = encryptBuffer(imageBuffer)
      image_encrypted = result.encrypted
      image_iv = result.iv
    }

    const { error } = await supabaseAdmin
      .from('partnership_inquiries')
      .insert({
        supabase_user_id,
        user_email,
        user_name,
        company_name,
        contact_phone: encryptedPhone,
        inquiry_type,
        title,
        content,
        image_encrypted,
        image_iv,
      })

    if (error) {
      console.error('[partnership-inquiry] DB 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[partnership-inquiry] 예외:', err)
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const phone = searchParams.get('phone')

    if (action === 'decrypt' && phone) {
      const decrypted = decryptText(phone)
      return NextResponse.json({ phone: decrypted })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[partnership-inquiry] GET 예외:', err)
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
