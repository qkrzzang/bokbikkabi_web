import Link from 'next/link'
import styles from '../terms.module.css'

export default function PrivacyPolicy() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/" className={styles.backButton}>
          ← 돌아가기
        </Link>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>개인정보처리방침</h1>

        <section className={styles.section}>
          <h2>제1조 (수집하는 개인정보 항목 및 최소화 원칙)</h2>
          <p>
            서비스는 서비스 제공에 반드시 필요한 최소한의 정보만을 수집합니다.
          </p>
          
          <h3>수집 제한:</h3>
          <p>
            서비스는 부동산 계약서 내의 중개업소 정보만을 식별하며, 그 외의 개인 식별 정보(주민등록번호, 이름 등)는 
            수집하지 않는 것을 원칙으로 합니다.
          </p>
          
          <p>
            사용자가 블라인드 처리하지 않은 정보가 포함되어 업로드될 경우, 시스템(OCR 및 필터링 워크플로우)을 통해 
            즉시 비식별화하거나 파기하여 서버에 저장되지 않도록 조치합니다.
          </p>

          <h3>필수 수집 정보:</h3>
          <ul>
            <li>소셜 로그인 정보 (카카오/구글 계정 이메일, 프로필 정보)</li>
            <li>리뷰 작성 시 평점, 태그, 코멘트</li>
            <li>계약서에서 추출된 중개업소 정보 (상호, 등록번호, 소재지)</li>
          </ul>

          <h3>자동 수집 정보:</h3>
          <ul>
            <li>서비스 이용 기록, IP 주소, 쿠키</li>
            <li>접속 로그, 불량 이용 기록</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제2조 (데이터 처리 위탁 및 보안)</h2>
          <p>
            계약서 이미지 분석을 위해 Upstage(OCR) 및 Google API를 활용하며, 이 과정에서 전달되는 데이터는 
            중개사 정보 식별 목적으로만 일시적으로 처리됩니다.
          </p>
          
          <p>
            모든 분석 프로세스는 데이터 비학습(Zero-Retention) 원칙을 준수하며, 외부 API 제공업체는 사용자의 데이터를 
            모델 학습에 활용하지 않습니다.
          </p>

          <h3>수탁업체 및 처리 업무:</h3>
          <ul>
            <li>Upstage: OCR 분석 (계약서 텍스트 추출)</li>
            <li>Google Cloud: 주소 검증 및 지오코딩</li>
            <li>Supabase: 데이터베이스 및 인증 서비스</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제3조 (개인정보의 이용 목적)</h2>
          <ul>
            <li>회원 관리 및 본인 확인</li>
            <li>리뷰 작성 및 관리</li>
            <li>중개업소 정보 제공</li>
            <li>포인트 적립 및 혜택 제공</li>
            <li>서비스 개선 및 통계 분석</li>
            <li>법령상 의무 이행</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제4조 (개인정보의 보유 및 이용 기간)</h2>
          <p>
            서비스는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
          </p>
          
          <h3>보유 기간:</h3>
          <ul>
            <li>회원 탈퇴 시: 즉시 파기 (법령상 보관 의무가 있는 정보 제외)</li>
            <li>계약서 이미지: 중개사 정보 추출 후 즉시 파기</li>
            <li>리뷰 정보: 회원 탈퇴 후 익명화 처리하여 통계 목적으로만 보관</li>
          </ul>

          <h3>법령에 따른 보관:</h3>
          <ul>
            <li>계약 또는 청약철회 기록: 5년 (전자상거래법)</li>
            <li>소비자 불만 또는 분쟁 처리 기록: 3년</li>
            <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제5조 (개인정보의 제3자 제공)</h2>
          <p>
            서비스는 원칙적으로 사용자의 개인정보를 제3자에게 제공하지 않습니다. 
            단, 다음의 경우는 예외로 합니다:
          </p>
          <ul>
            <li>사용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 요구가 있는 경우</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제6조 (사용자의 권리)</h2>
          <p>
            사용자는 언제든지 다음의 권리를 행사할 수 있습니다:
          </p>
          <ul>
            <li>개인정보 열람 요구</li>
            <li>개인정보 정정 요구</li>
            <li>개인정보 삭제 요구</li>
            <li>개인정보 처리 정지 요구</li>
            <li>회원 탈퇴</li>
          </ul>
          <p>
            권리 행사는 서비스 내 설정 메뉴 또는 고객센터를 통해 가능합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제7조 (개인정보 보호책임자)</h2>
          <p>
            서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 
            개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <ul>
            <li>이메일: contact@bokbikkabi.com</li>
            <li>전화: 고객센터 참조</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제8조 (개인정보 자동 수집 장치의 설치·운영 및 거부)</h2>
          <p>
            서비스는 쿠키 등 인터넷 서비스 이용 시 자동 생성되는 개인정보를 수집하는 장치를 운영합니다.
          </p>
          <p>
            사용자는 웹브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 이용에 제한이 있을 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제9조 (개인정보의 안전성 확보 조치)</h2>
          <p>
            서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
          </p>
          <ul>
            <li>개인정보 암호화</li>
            <li>해킹 등에 대비한 기술적 대책</li>
            <li>개인정보 취급 직원의 최소화 및 교육</li>
            <li>개인정보 보호 전담조직 운영</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>부칙</h2>
          <p>본 개인정보처리방침은 2026년 2월 7일부터 시행됩니다.</p>
          <p>이전 버전의 개인정보처리방침은 서비스 내에서 확인하실 수 있습니다.</p>
        </section>
      </div>
    </div>
  )
}
