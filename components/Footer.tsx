'use client'

import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.links}>
            <Link href="/terms/about" className={styles.link}>
              서비스 소개
            </Link>
            <span className={styles.separator}>|</span>
            <Link href="/terms/service" className={styles.link}>
              이용약관
            </Link>
            <span className={styles.separator}>|</span>
            <Link href="/terms/privacy" className={styles.link}>
              개인정보처리방침
            </Link>
          </div>
          <p className={styles.copyright}>
            © {currentYear} 복비까비. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
