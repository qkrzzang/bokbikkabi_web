'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CameraButton.module.css'

export default function CameraButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleButtonClick = () => {
    setIsConfirmModalOpen(true)
  }

  const handleConfirm = () => {
    setIsConfirmModalOpen(false)
    setIsOpen(true)
    setMode('select')
    setCapturedImage(null)
    // TODO: 리뷰 작성 페이지로 이동하거나 다음 프로세스 진행
    console.log('리뷰 작성 프로세스 시작')
  }

  const handleCancelConfirm = () => {
    setIsConfirmModalOpen(false)
  }

  const openModal = () => {
    setIsOpen(true)
    setMode('select')
    setCapturedImage(null)
  }

  const closeModal = () => {
    setIsOpen(false)
    setMode('select')
    setCapturedImage(null)
    stopCamera()
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCapturedImage(reader.result as string)
        setMode('upload')
      }
      reader.readAsDataURL(file)
    } else {
      alert('이미지 파일만 업로드 가능합니다.')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setMode('camera')
      }
    } catch (error) {
      console.error('카메라 접근 실패:', error)
      alert('카메라 접근 권한이 필요합니다.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')
        setCapturedImage(imageData)
        stopCamera()
        setMode('upload')
      }
    }
  }

  const handleImageSubmit = () => {
    if (capturedImage) {
      // TODO: 이미지를 서버로 전송하는 로직 구현
      console.log('이미지 전송:', capturedImage)
      alert('이미지가 업로드되었습니다! (실제 API 연동 필요)')
      closeModal()
    }
  }

  const handleCancel = () => {
    if (mode === 'camera') {
      stopCamera()
      setMode('select')
    } else {
      setCapturedImage(null)
      setMode('select')
    }
  }

  return (
    <>
      <div
        className={styles.buttonWrapper}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {showTooltip && (
          <div className={styles.tooltip}>리뷰 작성</div>
        )}
        <button
          className={styles.cameraButton}
          onClick={handleButtonClick}
          aria-label="리뷰 작성"
        >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 10.5L9.2 11.85L10.65 12L9.6 13.05L9.9 14.5L8.5 13.8L7.1 14.5L7.4 13.05L6.35 12L7.8 11.85L8.5 10.5Z"
            fill="currentColor"
          />
          <path
            d="M12 10.5L12.7 11.85L14.15 12L13.1 13.05L13.4 14.5L12 13.8L10.6 14.5L10.9 13.05L9.85 12L11.3 11.85L12 10.5Z"
            fill="currentColor"
          />
          <path
            d="M15.5 10.5L16.2 11.85L17.65 12L16.6 13.05L16.9 14.5L15.5 13.8L14.1 14.5L14.4 13.05L13.35 12L14.8 11.85L15.5 10.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
      </div>

      {isConfirmModalOpen && (
        <div className={styles.overlay} onClick={handleCancelConfirm}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmModalContent}>
              <h3 className={styles.confirmTitle}>리뷰를 작성하시겠습니까?</h3>
              <p className={styles.confirmMessage}>
                부동산 거래 후기를 작성하여 다른 분들에게 도움을 주세요.
              </p>
              <div className={styles.confirmButtons}>
                <button
                  className={styles.confirmCancelButton}
                  onClick={handleCancelConfirm}
                >
                  취소
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleConfirm}
                >
                  작성하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>부동산 계약서 업로드</h3>
              <button
                className={styles.closeButton}
                onClick={closeModal}
                aria-label="닫기"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className={styles.modalContent}>
              {mode === 'select' && (
                <>
                  {isMobile ? (
                    <div className={styles.selectMode}>
                      <button
                        className={styles.optionButton}
                        onClick={startCamera}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="13"
                            r="4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>카메라로 촬영</span>
                      </button>
                      <button
                        className={styles.optionButton}
                        onClick={handleFileSelect}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 10L12 15L17 10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 15V3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>갤러리에서 선택</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      ref={dropZoneRef}
                      className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className={styles.dropZoneContent}>
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={styles.dropZoneIcon}
                        >
                          <path
                            d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 10L12 15L17 10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 15V3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <p className={styles.dropZoneText}>
                          파일을 드래그 앤 드롭하거나 클릭하여 업로드
                        </p>
                        <p className={styles.dropZoneHint}>
                          이미지 파일만 업로드 가능합니다
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mode === 'camera' && (
                <div className={styles.cameraMode}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={styles.video}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className={styles.cameraControls}>
                    <button
                      className={styles.cancelButton}
                      onClick={handleCancel}
                    >
                      취소
                    </button>
                    <button
                      className={styles.captureButton}
                      onClick={capturePhoto}
                    >
                      <div className={styles.captureButtonInner} />
                    </button>
                    <div style={{ width: '60px' }} />
                  </div>
                </div>
              )}

              {mode === 'upload' && capturedImage && (
                <div className={styles.uploadMode}>
                  <img
                    src={capturedImage}
                    alt="업로드할 이미지"
                    className={styles.previewImage}
                  />
                  <div className={styles.uploadControls}>
                    <button
                      className={styles.cancelButton}
                      onClick={handleCancel}
                    >
                      다시 선택
                    </button>
                    <button
                      className={styles.submitButton}
                      onClick={handleImageSubmit}
                    >
                      업로드
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  )
}

