/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      ]
      
      const optionalEnvVars = [
        'NAVER_GEOCODING_CLIENT_ID',
        'NAVER_GEOCODING_CLIENT_SECRET'
      ]
      
      const missing = requiredEnvVars.filter(varName => !process.env[varName])
      const missingOptional = optionalEnvVars.filter(varName => !process.env[varName])
      
      if (missing.length > 0) {
        console.warn('\n⚠️  경고: .env.local에 다음 환경변수가 누락되었습니다:')
        missing.forEach(varName => console.warn(`  - ${varName}`))
        console.warn('\n')
      } else {
        console.log('✅ 모든 필수 환경변수가 .env.local에 설정되었습니다.\n')
      }
      
      if (missingOptional.length > 0) {
        console.log('💡 선택 사항: Geocoding API 사용을 위해 다음 환경변수를 추가하세요:')
        missingOptional.forEach(varName => console.log(`  - ${varName}`))
        console.log('   (없으면 NAVER_MAP 키를 대신 사용합니다)\n')
      }
    }
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self)',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig



