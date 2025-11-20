import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

// 메타데이터 베이스 URL 설정 (개발/프로덕션 환경에 따라 자동 설정)
const getMetadataBase = () => {
  // 프로덕션 환경에서는 환경 변수 사용, 없으면 기본값 사용
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL)
  }
  // 개발 환경에서는 localhost 사용
  if (process.env.NODE_ENV === 'development') {
    return new URL('http://localhost:3000')
  }
  // 기본값
  return new URL('http://localhost:3000')
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: 'CapitalFlow - 글로벌 자본 흐름 시각화',
  description: '글로벌 자본 흐름을 시각적으로 탐색하고 시대별 자본 권력의 이동을 분석하는 웹 애플리케이션',
  keywords: ['capital flow', 'investment', 'visualization', 'global economy', 'FDI', 'venture capital'],
  authors: [{ name: 'CapitalFlow Team' }],
  openGraph: {
    title: 'CapitalFlow - 글로벌 자본 흐름 시각화',
    description: '글로벌 자본 흐름을 시각적으로 탐색하고 시대별 자본 권력의 이동을 분석하는 웹 애플리케이션',
    type: 'website',
    locale: 'ko_KR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
