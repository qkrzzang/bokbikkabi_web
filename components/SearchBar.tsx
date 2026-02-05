'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  onSearch: (query: string) => void
  value?: string
}

export default function SearchBar({ onSearch, value }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // value prop이 변경되었을 때만 내부 상태 업데이트
  useEffect(() => {
    if (typeof value === 'string') {
      setQuery(value)
    }
  }, [value])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (trimmedQuery) {
      onSearch(trimmedQuery)
      // 검색 후 포커스 해제하여 모바일에서 확대된 화면을 원래대로 복구
      if (inputRef.current) {
        inputRef.current.blur()
      }
    } else {
      // 공백 또는 빈 검색어인 경우 logo 클릭과 동일한 이벤트 발생
      setQuery('')
      onSearch('')
      window.dispatchEvent(new Event('logo:click'))
      if (inputRef.current) {
        inputRef.current.blur()
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="공인중개사사무소명을 검색해보세요"
          className={styles.searchInput}
          autoComplete="off"
        />
        {query && (
          <button 
            type="button" 
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="검색어 지우기"
            style={{
              position: 'absolute',
              right: '52px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
              <path
                d="M15 9L9 15M9 9L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
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

