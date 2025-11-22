/** @type {import('next').NextConfig} */
const nextConfig = {
  // Render Static Site 배포를 위한 정적 export 설정
  output: 'export',
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  headers: async () => {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1',
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  },
  images: {
    domains: ['images.unsplash.com'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 개발 모드에서 캐시 비활성화
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
    // 개발 모드에서 정적 파일 캐시 비활성화
    generateBuildId: async () => {
      return 'development-' + Date.now()
    },
  }),
}

module.exports = nextConfig
