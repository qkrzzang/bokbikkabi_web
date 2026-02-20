export function isHeicFile(file: File): boolean {
    const type = file.type.toLowerCase()
    const name = file.name.toLowerCase()
    return (
        type === 'image/heic' ||
        type === 'image/heif' ||
        name.endsWith('.heic') ||
        name.endsWith('.heif')
    )
}

export function isImageFileLoose(file: File): boolean {
    if (file.type.startsWith('image/')) return true
    const name = file.name.toLowerCase()
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif', '.tiff', '.tif']
    return imageExtensions.some(ext => name.endsWith(ext))
}

export async function convertHeicToJpeg(file: File): Promise<File> {
    console.log('[HEIC] 변환 시작:', file.name, file.type, file.size)
    try {
        const heic2any = (await import('heic2any')).default
        const result = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9,
        })
        const jpegBlob = Array.isArray(result) ? result[0] : result
        const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
        const convertedFile = new File([jpegBlob], newName, { type: 'image/jpeg' })
        console.log('[HEIC] 변환 완료:', convertedFile.name, convertedFile.type, convertedFile.size)
        return convertedFile
    } catch (error) {
        console.error('[HEIC] 변환 실패:', error)
        throw new Error('HEIC 이미지를 변환할 수 없습니다. 다른 형식의 이미지를 사용해주세요.')
    }
}

export function validateAndNormalizeBase64(dataUrl: string): string {
    const cleaned = dataUrl.replace(/[\r\n\s]/g, '')
    const base64Regex = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/
    if (!base64Regex.test(cleaned)) {
        console.warn('[Base64] 유효하지 않은 패턴 감지, 앞 50자:', cleaned.substring(0, 50))
        if (!cleaned.startsWith('data:')) {
            return `data:image/jpeg;base64,${cleaned}`
        }
    }
    return cleaned
}

export function safeReadAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader()
            reader.onloadend = () => {
                try {
                    const result = reader.result as string
                    const normalized = validateAndNormalizeBase64(result)
                    resolve(normalized)
                } catch (error) {
                    console.error('[Base64] 정규화 중 에러:', error)
                    reject(error)
                }
            }
            reader.onerror = () => {
                console.error('[FileReader] 읽기 실패:', reader.error)
                reject(reader.error || new Error('파일 읽기에 실패했습니다.'))
            }
            reader.readAsDataURL(file)
        } catch (error) {
            console.error('[FileReader] ERROR:', error)
            reject(error)
        }
    })
}

export function resizeImageIfNeeded(file: File, maxDimension: number = 4096): Promise<File> {
    return new Promise((resolve) => {
        if (file.size <= 2 * 1024 * 1024) {
            resolve(file)
            return
        }

        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(url)
            const { width, height } = img

            if (width <= maxDimension && height <= maxDimension) {
                resolve(file)
                return
            }

            const scale = Math.min(maxDimension / width, maxDimension / height)
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(width * scale)
            canvas.height = Math.round(height * scale)
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                resolve(file)
                return
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const resized = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
                        console.log('[Resize] 이미지 리사이즈 완료:', { before: file.size, after: resized.size, scale: scale.toFixed(2) })
                        resolve(resized)
                    } else {
                        resolve(file)
                    }
                },
                'image/jpeg',
                0.85
            )
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            resolve(file)
        }
        img.src = url
    })
}
