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

        <p className={styles.intro}>
          와우랩주식회사(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」 등 관련 법령을 준수하며,
          이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록
          다음과 같은 처리방침을 수립·공개합니다.
        </p>

        <section className={styles.section}>
          <h2>제1조 (계약서 데이터 처리 및 비학습 보안 원칙)</h2>
          <p>
          회사는 이용자가 업로드하는 부동산 계약서 이미지에 대해 '<strong>필요 정보 외 영구 파기</strong>' 및 '<strong>AI 비학습(Zero-Retention)</strong>' 원칙을 철저히 준수합니다.
          </p>

          <h3>이미지 부분 절취(Crop) 및 파기</h3>
          <p>
            회사는 계약서 이미지에서 중개사 정보(상호, 등록번호, 소재지)가 포함된
            영역만을 절취(Crop)하여 활용합니다. 중개사 정보와 무관한 개인 식별 정보(성명,
            주민등록번호, 연락처, 상세 주소 등)가 포함된 원본 이미지 영역은 분석 직후 시스템에서
            즉시 파기하며 서버에 저장하지 않습니다.
          </p>

          <h3>데이터 비학습 원칙</h3>
          <p>
          계약서 분석 및 데이터 처리에 사용되는 Google AI(Gemini/Vertex AI), 
          Upstage OCR, 그리고 OpenAI(GPT-4o-mini) API는 이용자의 데이터를 모델 
          학습에 활용하지 않습니다. 분석 과정에서 전달되는 데이터는 오직 텍스트 추출 및 정보 
          검증 목적으로만 일시적으로 처리됩니다.
          </p>

          <h3>공개 정보의 활용</h3>
          <p>
            추출된 중개사 정보는 부동산협회 및 공공 데이터를 통해 확인 가능한 공개 정보이며,
            회사는 이를 중개사 식별 및 리뷰 권한 부여 목적으로만 활용합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제2조 (수집하는 개인정보 항목 및 저장 방법)</h2>
          <p>
            회사는 서비스 제공을 위해 필요한 최소한의 정보만을 수집하며, 민감한 정보는 암호화하여
            관리합니다.
          </p>

          <h3>필수 수집 항목</h3>
          <ul>
            <li><strong>소셜 로그인 정보:</strong> 이메일 주소, 프로필 정보(닉네임, 사진), 서비스 고유 식별자(UID)</li>
            <li><strong>서비스 이용 기록:</strong> 리뷰 내용(평점, 코멘트, 태그), 포인트 적립 및 사용 이력</li>
          </ul>

          <h3>암호화 저장 항목</h3>
          <p>
            계약서 이미지에서 절취된 중개사 정보(상호, 등록번호, 소재지)는 암호화 기술을 적용하여
            안전하게 저장합니다.
          </p>

          <h3>자동 수집 항목</h3>
          <ul>
            <li>IP 주소, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제3조 (개인정보의 처리 위탁 및 데이터 보관)</h2>
          <p>
            회사는 서비스의 안정성과 보안을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.
            메인 인프라는 AWS 서울 리전을 사용하여 국내에서 안전하게 보관됩니다.
          </p>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>수탁업체</th>
                  <th>위탁 업무 내용</th>
                  <th>데이터 보관 위치 및 기간</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Amazon Web Services (AWS)</td>
                  <td>서비스 호스팅 및 인프라 운영</td>
                  <td>대한민국 (서울 리전), 회원 탈퇴 시까지</td>
                </tr>
                <tr>
                  <td>Gemini API, OpenAI API</td>
                  <td>계약서 텍스트 데이터 분석 및 검증</td>
                  <td>비학습(Zero-Retention), 처리 후 즉시 파기</td>
                </tr>
                <tr>
                  <td>Upstage</td>
                  <td>OCR 분석 (계약서 텍스트 추출)</td>
                  <td>비학습(Zero-Retention), 처리 후 즉시 파기</td>
                </tr>
                <tr>
                  <td>Supabase (AWS)</td>
                  <td>데이터베이스 관리 및 사용자 인증</td>
                  <td>해외 서버(도쿄 등), 회원 탈퇴 시까지</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2>제4조 (개인정보의 이용 목적)</h2>
          <ul>
            <li><strong>회원 관리:</strong> 서비스 가입 의사 확인, 본인 식별, 부정 이용 방지</li>
            <li><strong>서비스 운영:</strong> 부동산 중개사 리뷰 시스템 제공, OCR을 통한 실제 거래 인증, 포인트 관리</li>
            <li><strong>보안 및 통계:</strong> 서비스 보안 강화, 이용 통계 분석 및 서비스 개선</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제5조 (개인정보의 보유 및 이용 기간)</h2>
          <p>
            회사는 원칙적으로 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
          </p>
          <ul>
            <li>
              <strong>회원 탈퇴 시:</strong> 즉시 파기 (단, 부정이용 방지를 위해 식별할 수 없는
              형태의 로그는 3개월간 보관)
            </li>
          </ul>

          <h3>법령에 의한 보관</h3>
          <ul>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
            <li>웹사이트 방문 기록(접속 로그): 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제6조 (데이터 보안을 위한 기술적·관리적 대책)</h2>
          <p>
            회사는 이용자의 소중한 정보를 보호하기 위해 다음과 같은 조치를 취합니다.
          </p>
          <ul>
            <li>
              <strong>물리적 보안:</strong> 주요 서비스 인프라를 AWS 서울 리전에 구축하여
              데이터 주권을 확보하고 물리적 보안을 강화하였습니다.
            </li>
            <li>
              <strong>암호화 기술:</strong> 중개사 정보 등 추출된 데이터는 암호화하여 저장하며,
              데이터 전송 시 SSL 보안 서버를 사용하여 암호화 통신을 수행합니다.
            </li>
            <li>
              <strong>접근 제어:</strong> 클라우드 보안 그룹(Security Group) 및 권한 관리
              시스템(IAM)을 통해 인가되지 않은 접근을 철저히 차단합니다.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제7조 (정보주체의 권리 및 행사방법)</h2>
          <p>
            이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제 요청할 수 있으며, 서비스 내
            설정 메뉴 또는 고객센터 이메일을 통해 권리를 행사할 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제8조 (개인정보 보호책임자)</h2>
          <ul>
            <li><strong>이메일:</strong> wow_lab@naver.com</li>
            <li><strong>문의:</strong> 서비스 내 고객센터 채널</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>부칙</h2>
          <p>본 개인정보 처리방침은 2026년 2월 15일부터 시행됩니다.</p>
        </section>
      </div>
    </div>
  )
}
