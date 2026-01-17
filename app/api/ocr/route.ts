import { NextRequest, NextResponse } from 'next/server'
import fetch from 'node-fetch'
import FormData from 'form-data'

const API_KEY = process.env.UPSTAGE_API_KEY || "up_PEzB2wnhVARJivBlmVrhl15k7fi3V"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      )
    }

    // File을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upstage API로 전송할 FormData 생성
    const upstageFormData = new FormData()
    upstageFormData.append('document', buffer, {
      filename: file.name,
      contentType: file.type,
    })
    upstageFormData.append('schema', 'oac')
    upstageFormData.append('model', 'ocr')

    // Upstage API 호출
    const response = await fetch( 
      'https://ap-northeast-2.apistage.ai/v1/document-ai/ocr',
      //'https://api.upstage.ai/v1/document-digitization',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
        body: upstageFormData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Upstage API Error:', errorText)
      return NextResponse.json(
        { error: `OCR API 오류: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('OCR 처리 중 오류:', error)
    return NextResponse.json(
      { error: 'OCR 처리 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
