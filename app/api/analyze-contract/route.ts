import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PROMPT = `당신은 입력 데이터를 분석하여 문서의 종류를 분류하고 핵심 정보를 추출하는 '부동산 문서 전문 AI'입니다.
OCR을 통해 추출된 텍스트가 입력됩니다.

입력 데이터를 분석하여 **계약서 유형(contract_type)**을 판별하고, **공인중개사 정보**, **계약일**, 그리고 **개인정보 포함 여부**를 추출하여 반드시 **JSON 형식**으로만 출력하세요.

### 1. 분류 기준 (Classification)
**A. 표준임대차계약서 (STANDARD)**
* 문서 제목이 '표준임대차계약서'이거나 '민간임대주택에 관한 특별법' 문구가 포함된 경우.
* 특징: '1. 계약 당사자'와 '2. 개업공인중개사' 항목이 명확히 번호로 구분되어 있음.

**B. 일반임대차계약서 (GENERAL)**
* 문서 제목이 '부동산(아파트) 매매 계약서', '부동산(아파트) 전세 계약서', '부동산(다세대/연립/빌라) 매매 계약서', '부동산(다세대/연립/빌라) 전세 계약서', '부동산임대차계약서', '아파트 전세계약서', '다세대/연립/빌라 월세 계약서', '다세대/연립/빌라 전세 계약서' 등 다양한 형태인 경우.
* 특징: 공인중개사 정보가 문서 맨 하단에 위치함.

**C. 계약서 아님 (NON_CONTRACT)**
* 부동산 계약 관련 핵심 키워드(아파트, 빌라, 다세대, 다가구, 연릭, 빌라, 매매,전세,월세)가 없고 양식이 아닌 경우.

### 2. 정보 추출 기준 (Extraction) - 중요
**[매우 중요] 공인중개사 정보는 오직 '타겟 섹션' 내에서만 찾아야 합니다.**
**공동 중개인 경우 두 중개사 정보를 배열에 담아야 합니다.**

**1) 공인중개사 정보 (Agent Info)**
* **검색 범위 (Search Zone)**:
    * 텍스트 전체에서 **'개업공인중개사'** 또는 **'공인중개사'** 라는 단어를 먼저 찾으세요.
    * **그 위쪽(상단)에 있는 텍스트는 전부 무시하세요.** (임대인, 임대사업자 정보 절대 금지)
    * 반드시 해당 단어 **아래쪽(하단)**이나 **옆**에서만 정보를 찾으세요.

1) [매우 중요] 공인중개사 등록번호(agent_number) 추출 및 검증
임대사업자 등록번호(예: 2024-지역명-12345)와 반드시 구분해야 합니다.

영역 제한 (Location Strategy):
반드시 '공인중개사' 또는 '개업공인중개사' 또는 '사무소소재지'라벨 이후에 등장하는 값을 탐색하세요.
'계약 당사자' 섹션의 정보(임대인/임대사업자)는 무시합니다.
데이터 구성 조건 (Strict Validation):
숫자 비중: 하이픈(-)을 제외한 순수 문자열에서 숫자(0-9)의 비중이 80% 이상이어야 합니다.
한글 배제: 값 중간에 '종로구', '수지구', '성남시' 등 지역명이 한글로 포함된 경우 100% 임대사업자 번호이므로 즉시 제외하세요.
패턴 특징: 보통 92300000-3945 또는 12345-2015-12345처럼 8~14자리 연속 숫자이거나, 시군구 코드가 포함된 숫자로 구성됩니다.

예외 처리:
'임대사업자 등록번호', '사업자등록번호', '법인등록번호', '계좌번호' 라는 단어와 인접한 번호는 절대 추출하지 마세요.
공동 중개 대응: 등록번호가 2개 이상 발견되면 모두 추출하여 **배열(Array)**에 담을 것.(극히 드문 case)

**2) 계약일 (contract_date)**
* **STANDARD**: 문서 상단이나 '1. 계약 당사자' 바로 위의 '계약일'을 찾으세요.
* **GENERAL**: 문서 최하단 서명란 근처의 '작성일' 또는 날짜를 찾으세요.
* 형식: 'YYYY년 MM월 DD일'

**3) 개인정보 포함 여부 (Sensitive Info Check)**
* 텍스트 전체에서 마스킹(가림 처리, 예: ***)되지 않은 **주민등록번호** 또는 **전화번호**가 존재하는지 확인하세요.
* **감지 대상**:
    1. **주민등록번호**: 숫자 6자리-숫자 7자리 패턴 (예: 880101-1234567)
    2. **전화번호**: 010-XXXX-XXXX 형태의 휴대폰 번호 또는 일반 전화번호
* 위 정보가 하나라도 평문(Unmasked)으로 노출되어 있다면 true, 모두 마스킹되어 있거나 없으면 false를 반환하세요.

### 3. 출력 형식 (JSON Only)
다른 설명 없이 오직 JSON만 출력하세요.
단일 계약 예시:
{
  "contract_type": "STANDARD" or "GENERAL" or "NON_CONTRACT",
  "confidence_score": 0~100 (정수),
  "doc_title": "문서 제목",
  "contract_date": "계약일자(작성일자)",
  "agent_number": ["등록번호1"],
  "has_sensitive_info": true 또는 false
  "reason": "판단 근거"
}

공동중개 예시:
{
  "contract_type": "STANDARD" or "GENERAL" or "NON_CONTRACT",
  "confidence_score": 0~100 (정수),
  "doc_title": "문서 제목",
  "contract_date": "계약일자(작성일자)",
  "agent_number": ["등록번호1","등록번호2"],
  "has_sensitive_info": true 또는 false,
  "reason": "판단 근거"
}`


/**
 * JSON 응답 파싱 헬퍼
 */
function parseJsonResponse(content: string): any {
  try {
    return JSON.parse(content)
  } catch {
    const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/)
    if (!jsonMatch) {
      throw new Error('JSON 형식을 찾을 수 없습니다.')
    }
    return JSON.parse(jsonMatch[0])
  }
}

/**
 * Gemini API로 계약서 분석
 */
async function analyzeWithGemini(text: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`

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
        temperature: 0.1,
        maxOutputTokens: 2000,
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

  if (!content) {
    throw new Error('Gemini 응답이 비어있습니다.')
  }

  return parseJsonResponse(content)
}

/**
 * GPT API로 계약서 분석 (Gemini 실패 시 fallback)
 */
async function analyzeWithGPT(text: string): Promise<any> {
  const apiKey = process.env.GPT_API_KEY
  if (!apiKey) {
    throw new Error('GPT_API_KEY 환경변수가 설정되지 않았습니다.')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: PROMPT,
        },
        {
          role: 'user',
          content: '--- OCR 추출 텍스트 ---\n' + text,
        },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`GPT API ${response.status}: ${errorData?.error?.message || '알 수 없는 오류'}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content || ''

  if (!content) {
    throw new Error('GPT 응답이 비어있습니다.')
  }

  return parseJsonResponse(content)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'OCR 텍스트가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`[analyze-contract] OCR 텍스트 수신: ${text.length}자`)

    // 1차: Gemini로 분석 시도
    try {
      const result = await analyzeWithGemini(text)
      console.log('[analyze-contract] Gemini 성공:', JSON.stringify(result).substring(0, 300))
      return NextResponse.json(result)
    } catch (geminiError: any) {
      console.warn('[analyze-contract] Gemini 실패, GPT fallback 시도:', geminiError.message)
    }

    // 2차: GPT fallback
    try {
      const result = await analyzeWithGPT(text)
      console.log('[analyze-contract] GPT fallback 성공:', JSON.stringify(result).substring(0, 300))
      return NextResponse.json(result)
    } catch (gptError: any) {
      console.error('[analyze-contract] GPT fallback도 실패:', gptError.message)
      return NextResponse.json(
        { error: 'Gemini 및 GPT 모두 분석에 실패했습니다.', detail: gptError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[analyze-contract] 예외:', error)
    return NextResponse.json(
      { error: error.message || '계약서 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
