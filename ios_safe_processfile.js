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

    // iOS Safari: Check file size (max 10MB to avoid memory issues)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size must be less than 10MB.')
      return
    }

    setOriginalFile(file)
    const reader = new FileReader()

    // iOS Safari: Add error handler for FileReader
    reader.onerror = () => {
      console.error('FileReader error:', reader.error)
      alert('Failed to read file. Please try again.')
    }

    reader.onloadend = () => {
      try {
        const result = reader.result as string
        
        // iOS Safari: Validate Data URL format strictly
        if (!result || typeof result !== 'string' || !result.startsWith('data:image/')) {
          console.error('Invalid Data URL format:', typeof result)
          alert('Invalid image format. Please try again.')
          return
        }

        // iOS Safari: Clean Base64 string - remove ALL whitespace characters
        // This fixes "The string did not match the expected pattern" error
        const cleanedResult = result.replace(/\\s+/g, '')
        
        console.log('Image processed successfully, size:', cleanedResult.length)
        setCapturedImage(cleanedResult)
        setMode('upload')
      } catch (error) {
        console.error('Error processing image:', error)
        alert('Error processing image. Please try again.')
      }
    }

    // iOS Safari: Wrap readAsDataURL in try-catch
    try {
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Error reading file. Please try again.')
    }
  }`;

content = content.replace(oldFunc, newFunc);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('iOS-safe processFile applied');
