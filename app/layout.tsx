import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: '복비까비 - 부동산 평가',
  description: '부동산 정보를 검색하고 평가해보세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const naverMapClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 네이버 지도 API 스크립트 (submodules=geocoder 추가) */}
        {naverMapClientId && (
          <Script
            id="naver-map-sdk"
            strategy="afterInteractive"
            type="text/javascript"
            src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverMapClientId}&submodules=geocoder`}
          />
        )}
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}



