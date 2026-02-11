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

/**
 * 계약서 이미지에서 중개사 도장 진위 검증
 * Gemini 2.5 Flash 사용
 * POST: FormData (file) 또는 JSON (image_base64)
 */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

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

   // 1. 엔드포인트를 v1beta로 설정 (기능 지원이 가장 확실합니다)
   // 1. URL 수정: 모델명 뒤에 :generateContent가 붙는 구조 확인
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`

const response = await fetch(geminiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: PROMPT + '\n\n이 부동산 계약서 이미지에서 개업공인중개사의 도장(인장)이 있는지 확인해주세요.',
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data.replace(/^data:image\/\w+;base64,/, ""),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 500,
      // response_mime_type 대신 responseMimeType (v1beta fetch 기준)
      responseMimeType: "application/json" 
    },
  }),
})

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[도장 검증] Gemini API 오류:', response.status, errorData)
      return NextResponse.json(
        {
          error: `Gemini API 오류: ${response.status}`,
          detail: errorData?.error?.message || '',
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Gemini 응답에서 텍스트 추출
    const content =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    console.log('[도장 검증] Gemini 응답:', content)

    // JSON 파싱
    let result: { agent_stamp: boolean; agent_stamp_confidence: number }

    try {
      // ```json ... ``` 블록 또는 순수 JSON 추출
      const jsonMatch = content.match(/\{[\s\S]*?\}/)
      if (!jsonMatch) {
        throw new Error('JSON 형식을 찾을 수 없습니다.')
      }
      result = JSON.parse(jsonMatch[0])

      // 타입 검증
      if (typeof result.agent_stamp !== 'boolean') {
        result.agent_stamp = Boolean(result.agent_stamp)
      }
      if (typeof result.agent_stamp_confidence !== 'number') {
        result.agent_stamp_confidence =
          parseInt(String(result.agent_stamp_confidence), 10) || 0
      }

      // 범위 보정
      result.agent_stamp_confidence = Math.max(
        0,
        Math.min(100, result.agent_stamp_confidence)
      )
    } catch (parseErr) {
      console.error('[도장 검증] 응답 파싱 오류:', parseErr, 'Raw:', content)
      return NextResponse.json(
        {
          error: '도장 검증 결과를 파싱할 수 없습니다.',
          raw_response: content,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[도장 검증] 예외:', error)
    return NextResponse.json(
      { error: error.message || '도장 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
