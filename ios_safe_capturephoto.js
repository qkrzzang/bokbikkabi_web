const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

const oldFunc = `  const capturePhoto = () => {
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
        
        // Canvas瑜?Blob?쇰줈 蹂?섑븯??File 媛앹껜 ?앹꽦
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' })
            setOriginalFile(file)
          }
        }, 'image/jpeg', 0.9)
        
        stopCamera()
        setMode('upload')
      }
    }
  }`;

const newFunc = `  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      try {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          console.error('Failed to get canvas context')
          alert('Failed to capture image. Please try again.')
          return
        }

        ctx.drawImage(video, 0, 0)
        
        // iOS Safari: Use lower quality (0.85) and clean the result
        const imageData = canvas.toDataURL('image/jpeg', 0.85)
        
        // iOS Safari: Validate and clean the Data URL
        if (!imageData || !imageData.startsWith('data:image/')) {
          console.error('Invalid canvas toDataURL result')
          alert('Failed to capture image. Please try again.')
          return
        }
        
        const cleanedImageData = imageData.replace(/\\s+/g, '')
        setCapturedImage(cleanedImageData)
        
        // iOS Safari: Enhanced Blob creation with error handling
        canvas.toBlob((blob) => {
          if (blob) {
            try {
              const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' })
              setOriginalFile(file)
              console.log('Camera image captured successfully')
              stopCamera()
              setMode('upload')
            } catch (error) {
              console.error('Error creating File from blob:', error)
              alert('Failed to process captured image. Please try again.')
            }
          } else {
            console.error('Failed to create blob from canvas')
            alert('Failed to capture image. Please try again.')
          }
        }, 'image/jpeg', 0.85)
      } catch (error) {
        console.error('Error capturing photo:', error)
        alert('Error capturing photo. Please try again.')
      }
    }
  }`;

content = content.replace(oldFunc, newFunc);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('iOS-safe capturePhoto applied');
