const fs = require('fs');
const content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace processFile function
const oldPattern = /const processFile = \(file: File\) => \{[\s\S]*?^\s{2}\}/m;

const newFunction = `  const processFile = (file: File) => {
    // iOS Safari compatibility: Check file type and size
    const isImageType = file.type.startsWith('image/') || 
                        file.name.toLowerCase().endsWith('.heic') || 
                        file.name.toLowerCase().endsWith('.heif')

    if (!isImageType) {
      setAlertModal({ show: true, message: 'Only image files can be uploaded.' })
      return
    }

    // iOS Safari: Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setAlertModal({ show: true, message: 'File size must be less than 10MB.' })
      return
    }

    setOriginalFile(file)
    const reader = new FileReader()

    reader.onerror = () => {
      console.error('FileReader error:', reader.error)
      setAlertModal({ show: true, message: 'Failed to read file. Please try again.' })
    }

    reader.onloadend = () => {
      try {
        const result = reader.result as string
        
        if (!result || !result.startsWith('data:image/')) {
          console.error('Invalid Data URL format')
          setAlertModal({ show: true, message: 'Invalid image format. Please try again.' })
          return
        }

        const cleanedResult = result.replace(/\s/g, '')
        
        setCapturedImage(cleanedResult)
        setMode('upload')
      } catch (error) {
        console.error('Error processing image:', error)
        setAlertModal({ show: true, message: 'Error processing image. Please try again.' })
      }
    }

    try {
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error reading file:', error)
      setAlertModal({ show: true, message: 'Error reading file. Please try again.' })
    }
  }`;

const newContent = content.replace(oldPattern, newFunction);

if (newContent !== content) {
  fs.writeFileSync('components/CameraButton.tsx', newContent, 'utf8');
  console.log('Replaced processFile successfully');
} else {
  console.log('Pattern not found');
}
