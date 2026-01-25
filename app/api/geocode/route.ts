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

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[Geocoding] API 키가 설정되지 않았습니다.')
    return NextResponse.json(
      { error: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodedAddress}`

    const response = await fetch(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
    })

    if (!response.ok) {
      console.error('[Geocoding] API 호출 실패:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Geocoding API 호출 실패' },
        { status: response.status }
      )
    }

    const data = await response.json()

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
