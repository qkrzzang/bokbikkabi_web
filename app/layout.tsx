import type { Metadata } from 'next'
import Script from 'next/script'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import './globals.css'

export const metadata: Metadata = {
  title: '복비까비 - 부동산 평가',
  description: '부동산 정보를 검색하고 평가해보세요',
  manifest: '/manifest.json',
  themeColor: '#F5A623',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '복비까비',
  },
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
        {/* 모바일 뷰포트 설정 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* PWA - iOS 지원 */}
        <link rel="apple-touch-icon" href="/images/bokbikkabi_icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="복비까비" />
        
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
      <body suppressHydrationWarning>
        <AuthProvider>
          <Header />
          {children}
          <Footer />
          <PWAInstallPrompt />
        </AuthProvider>
        {/* 실제 모바일 뷰포트 높이 계산 */}
        <Script
          id="mobile-viewport-height"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function setVhProperty() {
                  // 실제 뷰포트 높이를 계산 (주소창/툴바 제외)
                  const vh = window.innerHeight * 0.01;
                  document.documentElement.style.setProperty('--vh', vh + 'px');
                }
                
                // 초기 설정
                setVhProperty();
                
                // 리사이즈 이벤트 (방향 전환, 키보드 등)
                let resizeTimer;
                window.addEventListener('resize', function() {
                  clearTimeout(resizeTimer);
                  resizeTimer = setTimeout(setVhProperty, 100);
                });
                
                // orientationchange 이벤트 (iOS Safari)
                window.addEventListener('orientationchange', function() {
                  setTimeout(setVhProperty, 300);
                });
              })();
            `
          }}
        />
        
        {/* Chrome 확장 프로그램 오류 무시 */}
        <Script
          id="suppress-extension-errors"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message && e.message.includes('message channel closed')) {
                  e.preventDefault();
                  e.stopPropagation();
                  return true;
                }
              }, true);
              
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && e.reason.message.includes('message channel closed')) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              });
            `
          }}
        />
      </body>
    </html>
  )
}



