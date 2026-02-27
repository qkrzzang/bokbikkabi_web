const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find processFile function
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const processFile = (file: File) => {')) {
    console.log(`Found processFile at line ${i+1}`);
    
    // Find the end of the function
    let braceCount = 0;
    let endLine = i;
    for (let j = i; j < lines.length; j++) {
      for (const char of lines[j]) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      if (braceCount === 0 && j > i) {
        endLine = j;
        break;
      }
    }
    
    console.log(`Function ends at line ${endLine+1}`);
    
    // Replace entire function with iOS-compatible version
    const newFunction = `  const processFile = (file: File) => {
    // iOS Safari compatibility: Check file type and size
    const isImageType = file.type.startsWith('image/') || 
                        file.name.toLowerCase().endsWith('.heic') || 
                        file.name.toLowerCase().endsWith('.heif')

    if (!isImageType) {
      setAlertModal({ show: true, message: 'Only image files can be uploaded.' })
      return
    }

    // iOS Safari: Check file size (max 10MB to avoid memory issues)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setAlertModal({ show: true, message: 'File size must be less than 10MB.' })
      return
    }

    setOriginalFile(file)
    const reader = new FileReader()

    // iOS Safari: Add error handler
    reader.onerror = () => {
      console.error('FileReader error:', reader.error)
      setAlertModal({ show: true, message: 'Failed to read file. Please try again.' })
    }

    reader.onloadend = () => {
      try {
        const result = reader.result as string
        
        // iOS Safari: Validate Data URL format
        if (!result || !result.startsWith('data:image/')) {
          console.error('Invalid Data URL format')
          setAlertModal({ show: true, message: 'Invalid image format. Please try again.' })
          return
        }

        // iOS Safari: Clean Base64 string (remove whitespace and newlines)
        const cleanedResult = result.replace(/\\s/g, '')
        
        setCapturedImage(cleanedResult)
        setMode('upload')
      } catch (error) {
        console.error('Error processing image:', error)
        setAlertModal({ show: true, message: 'Error processing image. Please try again.' })
      }
    }

    // iOS Safari: Use readAsDataURL with error handling
    try {
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error reading file:', error)
      setAlertModal({ show: true, message: 'Error reading file. Please try again.' })
    }
  }`;
    
    // Remove old function and insert new one
    lines.splice(i, endLine - i + 1, newFunction);
    console.log('Replaced processFile function');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
