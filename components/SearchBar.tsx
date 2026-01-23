'use client'

import { useEffect, useState, FormEvent } from 'react'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  onSearch: (query: string) => void
  value?: string
}

export default function SearchBar({ onSearch, value }: SearchBarProps) {
  const [query, setQuery] = useState('')

  // 컴포넌트 마운트 로그
  useEffect(() => {
    console.log(`[검색창] SearchBar 컴포넌트 마운트`)
    console.log(`[검색창] 초기 value prop: "${value}"`)
    return () => {
      console.log(`[검색창] SearchBar 컴포넌트 언마운트`)
    }
  }, [])

  // value prop이 변경되었을 때만 내부 상태 업데이트
  useEffect(() => {
    if (typeof value === 'string') {
      console.log(`[검색창] 외부에서 값 설정: "${value}"`)
      setQuery(value)
    }
  }, [value])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    console.log(`[검색창] 폼 제출: "${trimmedQuery}"`)
    if (trimmedQuery) {
      onSearch(trimmedQuery)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log(`[검색창] onChange 이벤트 발생: "${newValue}"`)
    setQuery(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log(`[검색창] 키 입력: "${e.key}"`)
  }

  const handleFocus = () => {
    console.log(`[검색창] 포커스 획득`)
  }

  const handleBlur = () => {
    console.log(`[검색창] 포커스 해제`)
  }

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="공인중개사사무소명을 검색해보세요"
          className={styles.searchInput}
          autoComplete="off"
        />
        <button type="submit" className={styles.searchButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 19L14.65 14.65"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  )
}

