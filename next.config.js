/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Hydration 경고 감소
  
  // 환경변수 명시적 검증 (개발 환경에서만)
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      // .env.local에서 필수 환경변수 확인
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_ENCRYPTION_KEY'
      ]
      
      const missing = requiredEnvVars.filter(varName => !process.env[varName])
      
      if (missing.length > 0) {
        console.warn('\n⚠️  경고: .env.local에 다음 환경변수가 누락되었습니다:')
        missing.forEach(varName => console.warn(`  - ${varName}`))
        console.warn('\n')
      } else {
        console.log('✅ 모든 필수 환경변수가 .env.local에 설정되었습니다.\n')
      }
    }
    return []
  }
}

module.exports = nextConfig



