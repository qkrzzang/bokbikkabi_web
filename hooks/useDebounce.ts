import { useState, useEffect } from 'react'

/**
 * 값의 변경을 지정된 시간만큼 지연시키는 커스텀 훅.
 *
 * 입력값이 `delay`(ms) 동안 변경되지 않으면 디바운스된 값을 반환합니다.
 * 연속 입력 시 마지막 값만 반영되므로, 검색 API 호출 빈도 최적화에 유용합니다.
 *
 * @example
 * const debouncedQuery = useDebounce(searchQuery, 300)
 *
 * useEffect(() => {
 *   if (!debouncedQuery) return
 *   fetchSearchResults(debouncedQuery)
 * }, [debouncedQuery])
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
