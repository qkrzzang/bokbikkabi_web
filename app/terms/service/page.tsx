import Link from 'next/link'
import styles from '../terms.module.css'

export default function ServiceTerms() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/" className={styles.backButton}>
          ← 돌아가기
        </Link>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>이용약관</h1>

        <section className={styles.section}>
          <h2>제1조 (목적)</h2>
          <p>
            본 약관은 와우랩주식회사(이하 &ldquo;회사&rdquo;)가 운영하는 부동산 중개사 리뷰 플랫폼
            &lsquo;복비까비&rsquo;(이하 &ldquo;서비스&rdquo;)에서 제공하는 제반 서비스의 이용과 관련하여,
            회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제2조 (서비스의 제공 및 사용자의 의무)</h2>
          <p>
            본 서비스는 사용자가 업로드한 부동산 계약서 이미지에서 중개업소 정보를 추출하여 리뷰 권한을
            부여합니다.
          </p>

          <h3>사용자의 민감 정보 보호</h3>
          <p>
            사용자는 계약서 업로드 시, 중개사 정보(상호, 등록번호, 소재지 등)를 제외한 개인정보 및
            민감정보(본인 및 타인의 성명, 주민등록번호, 상세 주소, 연락처, 거래 금액 등)를 반드시
            가리거나 블라인드 처리하여 업로드해야 합니다.
          </p>
          <p>
            사용자가 전항의 의무를 소홀히 하여 발생한 개인정보 유출 사고에 대해 서비스는 고의 또는
            중과실이 없는 한 책임을 지지 않습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제3조 (회원가입 및 탈퇴)</h2>
          <p>
            서비스 이용을 위해서는 회사가 지정한 소셜 로그인 계정을 통한 가입이 필요합니다.
          </p>
          <p>
            회원은 언제든지 탈퇴를 요청할 수 있으며, 탈퇴 시 관련 법령에 따라 보관해야 하는 정보를
            제외한 모든 개인정보는 지체 없이 삭제됩니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제4조 (리뷰 작성 및 계약서 인증 관리)</h2>
          <p>
            리뷰는 실제 거래 경험을 바탕으로 작성되어야 하며, 허위 또는 악의적인 리뷰는 회사의 운영
            정책에 따라 삭제되거나 노출이 제한될 수 있습니다.
          </p>
          <p>
            중개사 정보 추출은 OCR 및 AI 기술을 활용하여 자동으로 처리되며, 사용자는 추출된 정보를
            확인하고 수정할 수 있습니다.
          </p>

          <h3>데이터 보안 관리</h3>
          <p>
            회사는 이용자의 개인정보 보호를 위해 계약서 이미지 분석 시 중개사 정보 외 영역을 즉시
            파기(Crop)하며, 인증에 필요한 정보만을 암호화하여 안전하게 관리합니다. 추출된 중개사
            정보는 중개사 식별 및 서비스 운영 목적으로만 활용됩니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제5조 (포인트 및 혜택)</h2>
          <p>
            서비스는 사용자의 활동(출석 체크, 리뷰 작성, 계약서 등록 등)에 대해 포인트를 부여할 수
            있습니다.
          </p>
          <p>
            포인트의 적립 및 사용 규칙은 서비스 정책에 따라 변경될 수 있으며, 변경 시 사전 공지합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제6조 (서비스의 변경 및 중단)</h2>
          <p>
            회사는 운영상, 기술상의 필요에 따라 서비스의 일부 또는 전부를 변경하거나 중단할 수 있습니다.
          </p>
          <p>
            중요한 변경사항은 최소 7일 전에 공지하며, 긴급한 사유가 있는 경우 사후에 공지할 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제7조 (면책조항)</h2>
          <p>
            회사는 다음의 경우 책임을 지지 않습니다.
          </p>
          <ul>
            <li>천재지변, 불가항력 등으로 인한 서비스 중단</li>
            <li>사용자의 귀책사유로 인한 서비스 이용 장애</li>
            <li>사용자가 게시한 정보의 신뢰성 및 정확성</li>
            <li>사용자가 개인정보 블라인드 처리를 하지 않아 발생한 정보 노출</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제8조 (분쟁 해결)</h2>
          <p>
            본 약관과 관련된 분쟁은 대한민국 법률을 준거법으로 하며, 관할 법원은 민사소송법상의
            관할법원으로 합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>부칙</h2>
          <p>본 약관은 2026년 2월 7일부터 시행됩니다.</p>
        </section>
      </div>
    </div>
  )
}
