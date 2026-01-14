'use client'

import styles from './Header.module.css'

export default function Header() {
  const handleLogin = () => {
    // TODO: 로그인 기능 구현
    console.log('로그인 클릭')
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logo}>
          복비까비
        </div>
        <div className={styles.rightSection}>
          <button className={styles.loginButton} onClick={handleLogin}>
            로그인
          </button>
        </div>
      </div>
    </header>
  )
}

