'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function TermsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => router.back()}
          aria-label="뒤로"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>약관 및 정책</h1>
        <div style={{ width: '40px' }} />
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'terms' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          서비스 이용약관
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'privacy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          개인정보 처리방침
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'terms' && (
          <div className={styles.policyContent}>
            <section className={styles.section}>
              <h2>제1조 (목적)</h2>
              <p>본 약관은 '복비까비'(이하 "회사")가 제공하는 부동산 리뷰 및 계약서 검증 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 회원의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
            </section>

            <section className={styles.section}>
              <h2>제2조 (용어의 정의)</h2>
              <p><strong>"검증"</strong>이란 회원이 업로드한 부동산 계약서 이미지를 회사가 AI 기술(OCR 등)을 활용하여 부동산 정보와 계약 사실을 확인하는 절차를 말합니다.</p>
              <p><strong>"마스킹"</strong>이란 계약서 내의 주민등록번호, 전화번호 등 민감한 개인정보를 식별할 수 없도록 가리는 행위를 말합니다.</p>
            </section>

            <section className={styles.section}>
              <h2>제3조 (회원의 의무 및 책임)</h2>
              <div className={styles.importantBox}>
                <p><strong>[중요] 개인정보 마스킹 의무</strong></p>
                <p>회원은 계약서 검증을 위해 이미지를 업로드할 때, 반드시 본인 및 임대인의 주민등록번호 뒷자리와 전화번호를 마스킹(가림 처리) 해야 합니다.</p>
                <p>이를 이행하지 않아 발생하는 개인정보 유출 사고 및 법적 책임은 회원 본인에게 있습니다.</p>
              </div>
              <p>회원은 타인의 계약서를 도용하거나 위변조하여 업로드해서는 안 됩니다.</p>
            </section>

            <section className={styles.section}>
              <h2>제4조 (서비스의 제공 및 한계)</h2>
              <p>1. 회사는 AI 기술을 활용하여 계약서의 진위 여부를 보조적으로 판단할 뿐, 해당 부동산 계약의 법적 효력을 보증하거나 안전성을 100% 담보하지 않습니다.</p>
              <p>2. 회사는 회원이 마스킹하지 않고 업로드한 문서에 대해 즉시 파기하거나 가림 처리를 요구할 수 있으며, 이에 응하지 않을 경우 서비스 이용을 제한할 수 있습니다.</p>
            </section>

            <div className={styles.footer}>
              <p><strong>시행일</strong>: 2026년 2월 2일</p>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className={styles.policyContent}>
            <section className={styles.section}>
              <h2>1. 개인정보의 처리 목적</h2>
              <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
              <ul>
                <li>서비스 회원 가입 및 관리: 본인 확인, 서비스 부정이용 방지</li>
                <li>부동산 계약 인증: OCR 및 AI 분석을 통한 실거주 및 계약 사실 검증</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>2. 처리하는 개인정보의 항목</h2>
              <div className={styles.importantBox}>
                <p><strong>주민등록번호는 절대 수집·저장하지 않습니다.</strong></p>
              </div>
              <p><strong>수집 항목:</strong> (마스킹 된) 계약서 사본 이미지, 부동산 주소, 계약 기간, 공인중개사 정보</p>
              <p><strong>검증 후 저장 항목:</strong> 검증 완료 여부, 검증 일시</p>
              <p className={styles.highlight}>※ 계약서 원본 이미지는 검증 완료 즉시 파기됩니다.</p>
            </section>

            <section className={styles.section}>
              <h2>3. 개인정보의 처리 위탁 (AI 기술 활용)</h2>
              <p>수탁 업체는 전달받은 데이터를 해당 서비스 제공 목적으로만 사용하며, <strong>자사의 AI 모델 학습(Training) 목적으로 사용하지 않습니다.</strong></p>
              
              <div className={styles.vendorList}>
                <div className={styles.vendorItem}>
                  <p className={styles.vendorName}>• Upstage (Upstage AI)</p>
                  <p>- 위탁 업무: OCR 텍스트 추출</p>
                  <p>- 보유 기간: 처리 직후 즉시 파기</p>
                  <p>- AI 학습: 학습하지 않음</p>
                </div>
                <div className={styles.vendorItem}>
                  <p className={styles.vendorName}>• Google LLC</p>
                  <p>- 위탁 업무: Gemini API 문서 분류</p>
                  <p>- 보유 기간: 처리 직후 즉시 파기</p>
                  <p>- AI 학습: 학습하지 않음</p>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h2>4. 개인정보의 파기</h2>
              <p>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
              <div className={styles.importantBox}>
                <p><strong>업로드된 계약서 이미지 파일은 AI 분석 및 검증 결과가 도출되는 즉시 서버 및 위탁 업체의 데이터베이스에서 영구 삭제됩니다.</strong></p>
              </div>
            </section>

            <section className={styles.section}>
              <h2>5. 정보주체의 권리</h2>
              <p>이용자는 언제든지 자신의 개인정보를 조회하거나 수정을 요청할 수 있으며, 회원 탈퇴를 통해 개인정보 이용에 대한 동의를 철회할 수 있습니다.</p>
            </section>

            <div className={styles.footer}>
              <p><strong>시행일</strong>: 2026년 2월 2일</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

