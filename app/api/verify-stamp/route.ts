import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PROMPT = `당신은 부동산 계약서 검증 전문가입니다.

이미지를 분석하여 다음을 수행하세요.

1. 계약서에서 "개업공인중개사" 또는 "중개사무소" 영역을 찾습니다.
2. 해당 영역 근처에 붉은색 또는 도장 형태의 인장(Seal/Stamp)이 존재하는지 확인합니다.
3. 임대인(매도인), 임차인(매수인)의 도장은 판단에서 제외합니다.
4. 반드시 "개업공인중개사" 영역과 직접적으로 연관된 도장만 판단합니다.

다음 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "agent_stamp": true/false,
  "agent_stamp_confidence": 0~100
}`

const USER_MESSAGE = '이 부동산 계약서 이미지에서 개업공인중개사의 도장(인장)이 있는지 확인해주세요.'

/**
 * 결과 타입 검증 및 보정
 */
function validateResult(raw: any): { agent_stamp: boolean; agent_stamp_confidence: number } {
  const result = { ...raw }

  if (typeof result.agent_stamp !== 'boolean') {
    result.agent_stamp = Boolean(result.agent_stamp)
  }
  if (typeof result.agent_stamp_confidence !== 'number') {
    result.agent_stamp_confidence = parseInt(String(result.agent_stamp_confidence), 10) || 0
  }
  result.agent_stamp_confidence = Math.max(0, Math.min(100, result.agent_stamp_confidence))

  return result
}

/**
 * JSON 파싱 헬퍼
 */
function parseJsonResponse(content: string): any {
  try {
    return JSON.parse(content)
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('JSON 형식을 찾을 수 없습니다.')
    }
    return JSON.parse(jsonMatch[0])
  }
}

/**
 * Gemini로 도장 검증
 */
async function verifyWithGemini(base64Data: string, mimeType: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정')

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT + '\n\n' + USER_MESSAGE },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Gemini API ${response.status}: ${errorData?.error?.message || '알 수 없는 오류'}`)
  }

  const data = await response.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!content) throw new Error('Gemini 응답이 비어있습니다.')

  return parseJsonResponse(content)
}

/**
 * GPT로 도장 검증 (Gemini 실패 시 fallback)
 */
async function verifyWithGPT(base64Data: string, mimeType: string): Promise<any> {
  const apiKey = process.env.GPT_API_KEY
  if (!apiKey) throw new Error('GPT_API_KEY 미설정')

  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const dataUrl = `data:${mimeType};base64,${cleanBase64}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_MESSAGE },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`GPT API ${response.status}: ${errorData?.error?.message || '알 수 없는 오류'}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content || ''

  if (!content) throw new Error('GPT 응답이 비어있습니다.')

  return parseJsonResponse(content)
}

/**
 * 계약서 이미지에서 중개사 도장 진위 검증
 * Gemini 1차 → GPT fallback
 * POST: FormData (file) 또는 JSON (image_base64)
 */
export async function POST(request: Request) {
  try {
    let base64Data = ''
    let mimeType = 'image/jpeg'

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
      }

      const buffer = await file.arrayBuffer()
      base64Data = Buffer.from(buffer).toString('base64')
      mimeType = file.type || 'image/jpeg'
    } else {
      const body = await request.json()

      if (body.image_base64) {
        base64Data = body.image_base64
        mimeType = body.mime_type || 'image/jpeg'
      } else {
        return NextResponse.json(
          { error: 'image_base64 또는 FormData file이 필요합니다.' },
          { status: 400 }
        )
      }
    }

    // 1차: Gemini로 검증
    try {
      const raw = await verifyWithGemini(base64Data, mimeType)
      const result = validateResult(raw)
      console.log('[도장 검증] Gemini 성공:', result)
      return NextResponse.json({ success: true, ...result })
    } catch (geminiError: any) {
      console.warn('[도장 검증] Gemini 실패, GPT fallback 시도:', geminiError.message)
    }

    // 2차: GPT fallback
    try {
      const raw = await verifyWithGPT(base64Data, mimeType)
      const result = validateResult(raw)
      console.log('[도장 검증] GPT fallback 성공:', result)
      return NextResponse.json({ success: true, ...result })
    } catch (gptError: any) {
      console.error('[도장 검증] GPT fallback도 실패:', gptError.message)
      return NextResponse.json(
        { error: 'Gemini 및 GPT 모두 도장 검증에 실패했습니다.', detail: gptError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[도장 검증] 예외:', error)
    return NextResponse.json(
      { error: error.message || '도장 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
