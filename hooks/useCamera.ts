import { useRef, useCallback, useState } from 'react'
import { validateAndNormalizeBase64 } from '@/lib/imageUtils'

interface UseCameraProps {
    onCapture: (dataUrl: string, file: File) => void
    onError: (message: string) => void
}

export function useCamera({ onCapture, onError }: UseCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [isActive, setIsActive] = useState(false)

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setIsActive(true)
            }
        } catch (error) {
            console.error('카메라 접근 실패:', error)
            onError('카메라 접근 권한이 필요합니다.')
        }
    }

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
            setIsActive(false)
        }
    }, [])

    const capturePhoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current
            const video = videoRef.current
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0)

                try {
                    // toDataURL은 동기적이지만 무거운 작업일 수 있음
                    const rawData = canvas.toDataURL('image/jpeg')
                    const normalizedData = validateAndNormalizeBase64(rawData)

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' })
                            onCapture(normalizedData, file)
                            stopCamera()
                        } else {
                            onError('이미지 변환에 실패했습니다.')
                        }
                    }, 'image/jpeg', 0.9)
                } catch (error) {
                    console.error('[useCamera] Capture error:', error)
                    onError('이미지 캡처 중 오류가 발생했습니다.')
                }
            }
        }
    }, [onCapture, stopCamera, onError])

    return {
        videoRef,
        canvasRef,
        startCamera,
        stopCamera,
        capturePhoto,
        isActive
    }
}
