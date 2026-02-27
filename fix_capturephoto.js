const fs = require('fs');
const content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace capturePhoto function
const oldPattern = /const capturePhoto = \(\) => \{[\s\S]*?canvas\.toBlob[\s\S]*?\}\s*\)/m;

const newFunction = `  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        try {
          ctx.drawImage(video, 0, 0)
          
          // iOS Safari: Use lower quality for better compatibility
          const imageData = canvas.toDataURL('image/jpeg', 0.85)
          
          // iOS Safari: Validate and clean the data URL
          if (imageData && imageData.startsWith('data:image/')) {
            const cleanedImageData = imageData.replace(/\s/g, '')
            setCapturedImage(cleanedImageData)
            
            // Canvas to Blob with error handling
            canvas.toBlob((blob) => {
              if (blob) {
                const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' })
                setOriginalFile(file)
                stopCamera()
                setMode('upload')
              } else {
                console.error('Failed to create blob from canvas')
                setAlertModal({ show: true, message: 'Failed to capture image. Please try again.' })
              }
            }, 'image/jpeg', 0.85)
          } else {
            console.error('Invalid image data from canvas')
            setAlertModal({ show: true, message: 'Failed to capture image. Please try again.' })
          }
        } catch (error) {
          console.error('Error capturing photo:', error)
          setAlertModal({ show: true, message: 'Error capturing photo. Please try again.' })
        }
      }
    }
  }`;

const newContent = content.replace(oldPattern, newFunction);

if (newContent !== content) {
  fs.writeFileSync('components/CameraButton.tsx', newContent, 'utf8');
  console.log('Replaced capturePhoto successfully');
} else {
  console.log('Pattern not found, trying alternative pattern...');
  
  // Try simpler pattern
  const lines = content.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const capturePhoto = () => {')) {
      console.log(`Found at line \`);
      found = true;
      break;
    }
  }
  if (!found) console.log('capturePhoto function not found');
}
