import CryptoJS from 'crypto-js'

// 환경변수에서 암호화 키 가져오기
const getEncryptionKey = (): string => {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY
  if (!key) {
    throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY가 설정되지 않았습니다.')
  }
  return key
}

/**
 * 파일을 Base64로 인코딩 후 AES 암호화
 * @param file 암호화할 파일
 * @returns 암호화된 Base64 문자열
 */
export async function encryptFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      try {
        const base64 = reader.result as string
        const key = getEncryptionKey()
        
        // AES 암호화
        const encrypted = CryptoJS.AES.encrypt(base64, key).toString()
        console.log('[암호화] 파일 암호화 완료')
        resolve(encrypted)
      } catch (error) {
        console.error('[암호화] 암호화 실패:', error)
        reject(error)
      }
    }
    
    reader.onerror = () => {
      console.error('[암호화] 파일 읽기 실패:', reader.error)
      reject(reader.error)
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * 암호화된 문자열을 복호화하여 Base64 이미지로 변환
 * @param encryptedData 암호화된 데이터
 * @returns 복호화된 Base64 이미지 문자열
 */
export function decryptFile(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    
    // AES 복호화
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key)
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8)
    
    if (!decryptedString) {
      throw new Error('복호화 결과가 비어있습니다.')
    }
    
    console.log('[복호화] 파일 복호화 완료')
    return decryptedString
  } catch (error) {
    console.error('[복호화] 복호화 실패:', error)
    throw error
  }
}

/**
 * 암호화된 데이터를 Blob으로 변환 (업로드용)
 * @param encryptedData 암호화된 문자열
 * @returns Blob 객체
 */
export function encryptedDataToBlob(encryptedData: string): Blob {
  return new Blob([encryptedData], { type: 'text/plain' })
}

