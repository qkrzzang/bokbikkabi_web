'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import styles from './SearchBar.module.css'

const REGIONS = [
  { value: '', label: '전체' },
  { value: '서울특별시', label: '서울' },
  { value: '경기도', label: '경기' },
  { value: '인천광역시', label: '인천' },
  { value: '부산광역시', label: '부산' },
  { value: '대구광역시', label: '대구' },
  { value: '광주광역시', label: '광주' },
  { value: '대전광역시', label: '대전' },
  { value: '울산광역시', label: '울산' },
  { value: '세종특별자치시', label: '세종' },
  { value: '강원특별자치도', label: '강원' },
  { value: '충청북도', label: '충북' },
  { value: '충청남도', label: '충남' },
  { value: '전북특별자치도', label: '전북' },
  { value: '전라남도', label: '전남' },
  { value: '경상북도', label: '경북' },
  { value: '경상남도', label: '경남' },
  { value: '제주특별자치도', label: '제주' },
]

interface SearchBarProps {
  onSearch: (query: string, region?: string) => void
  value?: string
  regionValue?: string
}

export default function SearchBar({ onSearch, value, regionValue }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // value prop이 변경되었을 때만 내부 상태 업데이트
  useEffect(() => {
    if (typeof value === 'string') {
      setQuery(value)
    }
  }, [value])

  // 외부에서 지역 값이 변경되었을 때 업데이트
  useEffect(() => {
    if (typeof regionValue === 'string') {
      setRegion(regionValue)
    }
  }, [regionValue])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (trimmedQuery) {
      onSearch(trimmedQuery, region)
      if (inputRef.current) {
        inputRef.current.blur()
      }
    } else {
      setQuery('')
      onSearch('', region)
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
    onSearch('', region)
  }

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = e.target.value
    setRegion(newRegion)
    // 검색어가 있으면 지역 변경 시 자동 재검색
    if (query.trim()) {
      onSearch(query.trim(), newRegion)
    }
  }

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <select
          value={region}
          onChange={handleRegionChange}
          className={styles.regionSelect}
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="부동산명 또는 주소를 검색해보세요"
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
