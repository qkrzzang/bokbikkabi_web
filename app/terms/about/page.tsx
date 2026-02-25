import Link from 'next/link'
import styles from '../terms.module.css'

export default function AboutService() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/" className={styles.backButton}>
          ← 돌아가기
        </Link>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>🏠 서비스 소개 : 복비까비(bokbiKkabi)</h1>

        <p style={{ fontSize: '18px', fontWeight: 600, color: '#7C3AED', lineHeight: '1.6', marginBottom: '24px' }}>
          &ldquo;좋은 집을 찾기 전, 좋은 중개사부터 만나세요.&rdquo;
        </p>

        <p className={styles.intro}>
          복비까비는 인생에서 가장 중요한 계약 중 하나인 부동산 거래에서, 사용자가 신뢰할 수 있는
          공인중개사를 선택할 수 있도록 돕는 중개 서비스 평가 플랫폼입니다.
        </p>
        <section className={styles.section}>
          <h2>1. 우리의 미션</h2>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#7C3AED', marginBottom: '12px' }}>
            &ldquo;복비가 아깝지 않은 중개 문화를 만듭니다.&rdquo;
          </p>
          <p>
            복비까비는 정직하고 유능한 공인중개사가 정당한 평가를 받고, 사용자는 안심하고 집을 구할 수 있는
            투명한 부동산 시장을 지향합니다. 여러분의 새로운 시작, 복비까비가 신뢰할 수 있는 파트너와 함께
            연결해 드립니다.
          </p>
        </section>
        <section className={styles.section}>
          <h2>2. 서비스 취지</h2>
          <p>
            단순히 운에 맡기는 중개사 선택이 아닌, 실제 경험자들의 데이터를 바탕으로 나에게 꼭 맞는 전문가를
            매칭해 드립니다. 집을 보러 다니고 대출을 고민하는 귀한 시간(손품, 발품)이 낭비되지 않도록,
            검증된 리뷰를 통해 최고의 중개 파트너를 제안합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. 핵심 가치 및 차별점</h2>
          <ul>
            <li>
              <strong>AI 계약서 진위 확인</strong>: 업계 최초로 AI가 실제 부동산 계약서를 정밀 분석하여
              리뷰의 진실성을 검증합니다. 허위 리뷰나 광고성 후기를 원천 차단하여 오직 &lsquo;진짜&rsquo;
              계약 사례 기반의 데이터만 제공합니다.
            </li>
            <li>
              <strong>다각도 중개 서비스 평가</strong>: 단순히 친절함을 넘어 대출 상담 전문성, 매물 권리
              분석 능력, 지역 정보 숙지 수준 등 실제 계약 과정에서 필요한 핵심 역량을 지표화하여 보여줍니다.
            </li>
            <li>
              <strong>최적의 파트너 결정 가이드</strong>: 손품을 팔고 집을 직접 보기(집품) 전, 어떤 중개사가
              내 자산과 시간을 가장 잘 지켜줄 수 있는지 리뷰를 통해 미리 판단할 수 있습니다.
            </li>
          </ul>
        </section>

        
      </div>
    </div>
  )
}
