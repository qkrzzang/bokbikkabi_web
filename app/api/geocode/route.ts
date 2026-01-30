import { NextRequest, NextResponse } from 'next/server'

// 네이버 Geocoding API를 사용하여 주소를 좌표로 변환
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json(
      { error: '주소가 필요합니다.' },
      { status: 400 }
    )
  }

  // Geocoding 전용 키 우선 사용, 없으면 Maps 키 사용
  const clientId = process.env.NAVER_GEOCODING_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  const clientSecret = process.env.NAVER_GEOCODING_CLIENT_SECRET || process.env.NAVER_MAP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[Geocoding] API 키가 설정되지 않았습니다.')
    console.error('[Geocoding] 필요한 환경변수: NAVER_GEOCODING_CLIENT_ID, NAVER_GEOCODING_CLIENT_SECRET')
    return NextResponse.json(
      { error: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  console.log('[Geocoding] 사용 중인 키:', clientId.substring(0, 5) + '...')

  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodedAddress}`

    console.log('[Geocoding] API 호출:', { address, url: url.substring(0, 100) })
    console.log('[Geocoding] Client ID:', clientId)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key': clientSecret,
        'Accept': 'application/json',
      },
    })
    
    console.log('[Geocoding] 요청 헤더:', {
      'x-ncp-apigw-api-key-id': clientId,
      'x-ncp-apigw-api-key': clientSecret.substring(0, 10) + '...'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Geocoding] API 호출 실패:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      return NextResponse.json(
        { error: `Geocoding API 호출 실패: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[Geocoding] API 응답:', data)

    // 결과가 있는지 확인
    if (!data.addresses || data.addresses.length === 0) {
      console.log('[Geocoding] 주소를 찾을 수 없음:', address)
      return NextResponse.json(
        { error: '주소를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 첫 번째 결과의 좌표 반환
    const { x, y } = data.addresses[0]
    console.log('[Geocoding] 성공:', address, '→', { lat: y, lng: x })

    return NextResponse.json({
      lat: parseFloat(y),
      lng: parseFloat(x),
      address: data.addresses[0].roadAddress || data.addresses[0].jibunAddress,
    })
  } catch (error) {
    console.error('[Geocoding] 오류:', error)
    return NextResponse.json(
      { error: '좌표 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
