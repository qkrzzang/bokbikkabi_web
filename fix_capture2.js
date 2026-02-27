const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const capturePhoto = () => {')) {
    console.log(`Found capturePhoto at line ${i+1}`);
    
    // Replace line by line
    if (lines[i+9] && lines[i+9].includes('const imageData = canvas.toDataURL')) {
      lines[i+9] = '          const imageData = canvas.toDataURL(''image/jpeg'', 0.85)';
      console.log('Updated toDataURL quality');
    }
    
    // Add try-catch wrapper after ctx check
    if (lines[i+8] && lines[i+8].includes('ctx.drawImage')) {
      lines.splice(i+8, 0, '        try {');
      
      // Find stopCamera line and wrap
      for (let j = i+10; j < i+25; j++) {
        if (lines[j] && lines[j].includes('stopCamera()')) {
          // Replace stopCamera block
          lines[j] = '            // Canvas to Blob with error handling';
          lines[j+1] = '            canvas.toBlob((blob) => {';
          lines[j+2] = '              if (blob) {';
          lines[j+3] = '                const file = new File([blob], ''captured-image.jpg'', { type: ''image/jpeg'' })';
          lines[j+4] = '                setOriginalFile(file)';
          lines[j+5] = '                stopCamera()';
          lines[j+6] = '                setMode(''upload'')';
          lines[j+7] = '              } else {';
          lines[j+8] = '                console.error(''Failed to create blob from canvas'')';
          lines[j+9] = '                setAlertModal({ show: true, message: ''Failed to capture image. Please try again.'' })';
          lines[j+10] = '              }';
          lines[j+11] = '            }, ''image/jpeg'', 0.85)';
          lines[j+12] = '        } catch (error) {';
          lines[j+13] = '          console.error(''Error capturing photo:'', error)';
          lines[j+14] = '          setAlertModal({ show: true, message: ''Error capturing photo. Please try again.'' })';
          lines[j+15] = '        }';
          
          // Remove old lines
          lines.splice(j+16, 5);
          console.log('Added error handling');
          break;
        }
      }
      break;
    }
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
