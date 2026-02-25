'use client'

import { useEffect, useState, useRef, FormEvent, useCallback } from 'react'
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

interface AutocompleteItem {
  id: number
  agent_name: string
  road_address: string | null
  lot_address: string | null
}

interface SearchBarProps {
  onSearch: (query: string, region?: string) => void
  value?: string
  regionValue?: string
}

export default function SearchBar({ onSearch, value, regionValue }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isShaking, setIsShaking] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (typeof value === 'string') {
      setQuery(value)
    }
  }, [value])

  useEffect(() => {
    if (typeof regionValue === 'string') {
      setRegion(regionValue)
    }
  }, [regionValue])

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 자동완성 API 호출 (debounce 300ms)
  const fetchSuggestions = useCallback((q: string, r: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (q.trim().length < 1) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const params = new URLSearchParams({ q: q.trim(), mode: 'autocomplete' })
        if (r) params.set('region', r)

        const res = await fetch(`/api/search-agents?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!res.ok) return

        const { data } = await res.json()
        setSuggestions(data || [])
        setShowDropdown((data || []).length > 0)
        setActiveIndex(-1)
      } catch {
        // abort 등 무시
      }
    }, 300)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    fetchSuggestions(val, region)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setShowDropdown(false)
    const trimmedQuery = query.trim()
    if (trimmedQuery) {
      onSearch(trimmedQuery, region)
      if (inputRef.current) inputRef.current.blur()
    } else {
      setIsShaking(true)
      setToastMessage('지역이나 부동산명을 입력해 주세요')
      setTimeout(() => setIsShaking(false), 500)
      setTimeout(() => setToastMessage(''), 2500)
      inputRef.current?.focus()
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowDropdown(false)
    onSearch('', region)
  }

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = e.target.value
    setRegion(newRegion)
    if (query.trim()) {
      fetchSuggestions(query, newRegion)
      onSearch(query.trim(), newRegion)
    }
  }

  const handleSuggestionClick = (item: AutocompleteItem) => {
    setQuery(item.agent_name)
    setShowDropdown(false)

    // 주소에서 지역(시/도) 추출하여 콤보박스 자동 변경
    const address = item.road_address || item.lot_address || ''
    const matchedRegion = REGIONS.find(r => r.value && address.includes(r.value))
    const newRegion = matchedRegion?.value || ''
    setRegion(newRegion)

    onSearch(item.agent_name, newRegion)
    if (inputRef.current) inputRef.current.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  // 주소에서 구 단위 추출
  const extractDistrict = (address: string | null): string | null => {
    if (!address) return null
    const match = address.match(/([가-힣]+[구군])\s/)
    if (match) return match[1]
    const match2 = address.match(/\s([가-힣]+구)/)
    return match2 ? match2[1] : null
  }

  // 하이라이팅
  const highlightMatch = (text: string) => {
    if (!query.trim() || !text) return text
    const tokens = query.split(/\s+/).filter(t => t.length > 0)
    const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? `<mark>${part}</mark>`
        : part
    ).join('')
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
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true)
          }}
          placeholder="부동산명 또는 주소를 검색해보세요"
          className={`${styles.searchInput} ${isShaking ? styles.shake : ''}`}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {query && (
          <button 
            type="button" 
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="검색어 지우기"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
              <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <button type="submit" className={styles.searchButton}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>

      {/* 빈 검색 토스트 */}
      {toastMessage && (
        <div className={styles.toast}>{toastMessage}</div>
      )}

      {/* 자동완성 드롭다운 */}
      {showDropdown && suggestions.length > 0 && (
        <div ref={dropdownRef} className={styles.autocompleteDropdown} role="listbox">
          {suggestions.map((item, index) => {
            const district = extractDistrict(item.road_address || item.lot_address)
            const roadAddr = item.road_address || ''
            const lotAddr = item.lot_address || ''
            const showBoth = roadAddr && lotAddr && roadAddr !== lotAddr
            return (
              <div
                key={item.id}
                className={`${styles.autocompleteItem} ${index === activeIndex ? styles.autocompleteItemActive : ''}`}
                onClick={() => handleSuggestionClick(item)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                aria-selected={index === activeIndex}
              >
                <div className={styles.autocompleteMain}>
                  {district && <span className={styles.autocompleteBadge}>{district}</span>}
                  <span
                    className={styles.autocompleteName}
                    dangerouslySetInnerHTML={{ __html: highlightMatch(item.agent_name) }}
                  />
                </div>
                {showBoth ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span
                      className={styles.autocompleteAddress}
                      dangerouslySetInnerHTML={{ __html: highlightMatch(roadAddr) }}
                    />
                    <span
                      className={styles.autocompleteAddress}
                      style={{ color: '#9ca3af' }}
                      dangerouslySetInnerHTML={{ __html: `(지번) ${highlightMatch(lotAddr)}` }}
                    />
                  </div>
                ) : (roadAddr || lotAddr) ? (
                  <span
                    className={styles.autocompleteAddress}
                    dangerouslySetInnerHTML={{ __html: highlightMatch(roadAddr || lotAddr) }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
