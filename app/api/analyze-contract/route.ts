import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PROMPT = `당신은 부동산 계약서 OCR 텍스트 분석 전문가입니다.

아래는 부동산 계약서에서 OCR로 추출된 텍스트입니다. 이 텍스트를 분석하여 다음 정보를 추출하세요.

## 추출 규칙

1. **contract_type**: 계약 유형을 판별합니다.
   - "RENTAL" : 임대차(전세/월세) 계약서
   - "SALE" : 매매 계약서
   - "NON_CONTRACT" : 부동산 계약서가 아닌 문서

2. **agent_number**: 개업공인중개사(중개사무소)의 등록번호입니다.
   - "등록번호", "사업자등록번호", "개업공인중개사" 근처에서 찾으세요.
   - 공동중개인 경우 배열로 반환하세요. 예: ["12345-2024-00001", "12345-2024-00002"]
   - 단일 중개인 경우에도 문자열로 반환하세요. 예: "12345-2024-00001"
   - 찾을 수 없으면 빈 문자열 ""

3. **agent_name**: 중개사무소(개업공인중개사 사무소)의 상호명입니다.
   - "사무소명", "상호", "중개사무소" 근처에서 찾으세요.
   - 찾을 수 없으면 빈 문자열 ""

4. **agent_address**: 중개사무소의 소재지입니다.
   - "소재지", "사무소 소재지" 근처에서 찾으세요.
   - 찾을 수 없으면 빈 문자열 ""

5. **contract_date**: 계약 날짜입니다.
   - "YYYY-MM-DD" 형식으로 반환하세요.
   - 찾을 수 없으면 null

6. **doc_title**: 문서 제목 (예: "부동산 임대차계약서", "부동산 매매계약서")
   - 찾을 수 없으면 빈 문자열 ""

7. **confidence_score**: 추출 결과에 대한 신뢰도 (0~100)

## 응답 형식

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

한 장에 여러 계약이 포함된 경우 배열로 반환하고, 단일 계약이면 단일 객체로 반환하세요.

단일 계약 예시:
{
  "contract_type": "RENTAL",
  "agent_number": "12345-2024-00001",
  "agent_name": "OO공인중개사사무소",
  "agent_address": "서울특별시 강남구 ...",
  "contract_date": "2024-01-15",
  "doc_title": "부동산 임대차계약서",
  "confidence_score": 85
}

공동중개 예시:
{
  "contract_type": "RENTAL",
  "agent_number": ["12345-2024-00001", "12345-2024-00002"],
  "agent_name": "OO공인중개사사무소",
  "agent_address": "서울특별시 강남구 ...",
  "contract_date": "2024-01-15",
  "doc_title": "부동산 임대차계약서",
  "confidence_score": 85
}`

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'OCR 텍스트가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`[analyze-contract] OCR 텍스트 수신: ${text.length}자`)

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: PROMPT + '\n\n--- OCR 추출 텍스트 ---\n' + text,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[analyze-contract] Gemini API 오류:', response.status, errorData)
      return NextResponse.json(
        {
          error: `Gemini API 오류: ${response.status}`,
          detail: errorData?.error?.message || '',
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    console.log('[analyze-contract] Gemini 응답:', content.substring(0, 500))

    if (!content) {
      return NextResponse.json(
        { error: 'AI 분석 결과가 비어있습니다.' },
        { status: 500 }
      )
    }

    // JSON 파싱
    let result: any
    try {
      result = JSON.parse(content)
    } catch {
      // JSON 블록 추출 시도
      const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/)
      if (!jsonMatch) {
        console.error('[analyze-contract] JSON 파싱 실패. Raw:', content.substring(0, 300))
        return NextResponse.json(
          { error: 'AI 응답을 파싱할 수 없습니다.', raw_response: content.substring(0, 500) },
          { status: 500 }
        )
      }
      result = JSON.parse(jsonMatch[0])
    }

    console.log('[analyze-contract] 파싱 결과:', JSON.stringify(result).substring(0, 300))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[analyze-contract] 예외:', error)
    return NextResponse.json(
      { error: error.message || '계약서 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
