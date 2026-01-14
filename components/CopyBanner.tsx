'use client'

import { useState, useEffect } from 'react'
import styles from './CopyBanner.module.css'

const copyOptions = [
  {
    main: '계약하기 전, 이 부동산 괜찮을까?',
    sub: '실제 계약서를 인증한 사람들의 100% 찐후기를 먼저 확인하세요.',
  },
  {
    main: '나만 복비 더 내는 거 아닐까?',
    sub: '우리 동네 부동산의 수수료 할인율과 후기를 미리 알아보세요.',
  },
  {
    main: '우리 동네 \'착한 부동산\'은 어디일까요?',
    sub: '지금 가장 칭찬받는 중개사님을 찾아보세요.',
  },
]

export default function CopyBanner() {
  const [selectedCopy, setSelectedCopy] = useState(copyOptions[0])

  useEffect(() => {
    // 랜덤으로 카피 선택
    const randomIndex = Math.floor(Math.random() * copyOptions.length)
    setSelectedCopy(copyOptions[randomIndex])
  }, [])

  return (
    <div className={styles.banner}>
      <h2 className={styles.mainCopy}>{selectedCopy.main}</h2>
      <p className={styles.subCopy}>{selectedCopy.sub}</p>
    </div>
  )
}



