const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const capturePhoto = () => {')) {
    console.log(`Found capturePhoto at line ${i+1}`);
    
    // Find function end
    let braceCount = 0;
    let endIdx = i;
    for (let j = i; j < lines.length; j++) {
      for (const char of lines[j]) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      if (braceCount === 0 && j > i) {
        endIdx = j;
        break;
      }
    }
    
    console.log(`Function ends at line ${endIdx+1}`);
    
    const newLines = [
      '  const capturePhoto = () => {',
      '    if (videoRef.current && canvasRef.current) {',
      '      try {',
      '        const canvas = canvasRef.current',
      '        const video = videoRef.current',
      '        canvas.width = video.videoWidth',
      '        canvas.height = video.videoHeight',
      '        const ctx = canvas.getContext(\'2d\')',
      '        ',
      '        if (!ctx) {',
      '          alert(\'Failed to capture image.\')',
      '          return',
      '        }',
      '',
      '        ctx.drawImage(video, 0, 0)',
      '        ',
      '        // Resize for better compatibility',
      '        const maxDim = 1920',
      '        let w = canvas.width',
      '        let h = canvas.height',
      '        ',
      '        if (w > maxDim || h > maxDim) {',
      '          if (w > h) {',
      '            h = (h * maxDim) / w',
      '            w = maxDim',
      '          } else {',
      '            w = (w * maxDim) / h',
      '            h = maxDim',
      '          }',
      '          ',
      '          const resizeCanvas = document.createElement(\'canvas\')',
      '          resizeCanvas.width = w',
      '          resizeCanvas.height = h',
      '          const resizeCtx = resizeCanvas.getContext(\'2d\')',
      '          ',
      '          if (resizeCtx) {',
      '            resizeCtx.drawImage(canvas, 0, 0, w, h)',
      '            const imageData = resizeCanvas.toDataURL(\'image/jpeg\', 0.85)',
      '            setCapturedImage(imageData)',
      '            ',
      '            resizeCanvas.toBlob((blob) => {',
      '              if (blob) {',
      '                const file = new File([blob], \'captured-image.jpg\', { type: \'image/jpeg\' })',
      '                setOriginalFile(file)',
      '              }',
      '            }, \'image/jpeg\', 0.85)',
      '          }',
      '        } else {',
      '          const imageData = canvas.toDataURL(\'image/jpeg\', 0.85)',
      '          setCapturedImage(imageData)',
      '          ',
      '          canvas.toBlob((blob) => {',
      '            if (blob) {',
      '              const file = new File([blob], \'captured-image.jpg\', { type: \'image/jpeg\' })',
      '              setOriginalFile(file)',
      '            }',
      '          }, \'image/jpeg\', 0.85)',
      '        }',
      '        ',
      '        stopCamera()',
      '        setMode(\'upload\')',
      '      } catch (error) {',
      '        console.error(\'Error capturing photo:\', error)',
      '        alert(\'Failed to capture photo.\')',
      '      }',
      '    }',
      '  }'
    ];
    
    lines.splice(i, endIdx - i + 1, ...newLines);
    console.log('Replaced capturePhoto');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
