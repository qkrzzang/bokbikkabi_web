const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

const oldFunc = `  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setOriginalFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCapturedImage(reader.result as string)
        setMode('upload')
      }
      reader.readAsDataURL(file)
    } else {
      alert('?대?吏 ?뚯씪留??낅줈??媛?ν빀?덈떎.')
    }
  }`;

const newFunc = `  const processFile = (file: File) => {
    // iOS Safari compatibility: Support HEIC and validate file type
    const isImageType = file.type.startsWith('image/') || 
                        file.name.toLowerCase().endsWith('.heic') || 
                        file.name.toLowerCase().endsWith('.heif')

    if (!isImageType) {
      alert('Only image files can be uploaded.')
      return
    }

    // iOS Safari: Check file size
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      alert('File size must be less than 20MB.')
      return
    }

    setOriginalFile(file)
    
    // iOS Safari: Resize large images to prevent memory issues
    const reader = new FileReader()
    
    reader.onerror = () => {
      console.error('FileReader error:', reader.error)
      alert('Failed to read file. Please try again.')
    }

    reader.onload = (e) => {
      try {
        const result = e.target?.result as string
        
        if (!result || !result.startsWith('data:image/')) {
          console.error('Invalid image data')
          alert('Invalid image format.')
          return
        }

        // iOS Safari: Resize image if too large
        const img = new Image()
        img.onload = () => {
          try {
            const maxDimension = 1920
            let width = img.width
            let height = img.height

            // Calculate new dimensions if image is too large
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = (height * maxDimension) / width
                width = maxDimension
              } else {
                width = (width * maxDimension) / height
                height = maxDimension
              }
            }

            // Create canvas and resize
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')

            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height)
              const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
              
              console.log('Image processed - Original:', img.width, 'x', img.height, 'Final:', width, 'x', height)
              setCapturedImage(resizedDataUrl)
              setMode('upload')
            } else {
              setCapturedImage(result)
              setMode('upload')
            }
          } catch (error) {
            console.error('Error resizing image:', error)
            setCapturedImage(result)
            setMode('upload')
          }
        }
        
        img.onerror = () => {
          console.error('Failed to load image')
          alert('Failed to load image. Please try again.')
        }
        
        img.src = result
      } catch (error) {
        console.error('Error processing image:', error)
        alert('Error processing image.')
      }
    }

    try {
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Error reading file.')
    }
  }`;

if (content.includes(oldFunc)) {
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
  console.log('SUCCESS: Applied iOS-safe processFile with image resizing');
} else {
  console.log('ERROR: Pattern not found');
}
