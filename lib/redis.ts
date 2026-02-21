import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Cache-aside pattern: Redis에서 조회 -> miss 시 fn() 실행 -> 결과 캐싱
 * Redis 장애 시 graceful fallback (DB 직접 조회)
 */
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get<T>(key)
    if (hit !== null && hit !== undefined) return hit
  } catch (err) {
    console.warn('[Redis] GET failed, falling back to DB:', key, err)
  }

  const data = await fn()

  try {
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch (err) {
    console.warn('[Redis] SETEX failed:', key, err)
  }

  return data
}

/**
 * 패턴 기반 캐시 무효화
 * 예: invalidate('search:*') → search: 로 시작하는 모든 키 삭제
 */
export async function invalidate(...patterns: string[]) {
  try {
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
        console.log(`[Redis] Invalidated ${keys.length} keys for pattern: ${pattern}`)
      }
    }
  } catch (err) {
    console.warn('[Redis] Invalidation failed:', err)
  }
}

/**
 * 검색 쿼리를 sha256 해시로 변환 (캐시 키용, 충돌 방지)
 * 문자열 또는 객체 모두 안전하게 처리
 */
export function hashQuery(input: string | Record<string, unknown>): string {
  const str = typeof input === 'string'
    ? input.toLowerCase().trim()
    : JSON.stringify(input)
  return createHash('sha256').update(str).digest('hex').slice(0, 16)
}
