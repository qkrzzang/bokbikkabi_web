import type { Metadata } from 'next'
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
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}



