const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find processFile and replace it (lines 533-545)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const processFile = (file: File) => {')) {
    console.log(`Found processFile at line ${i+1}`);
    
    // Find the closing brace
    let endIdx = i;
    for (let j = i+1; j < Math.min(lines.length, i+20); j++) {
      if (lines[j].trim() === '}' && lines[j-1].includes('}')) {
        endIdx = j;
        break;
      }
    }
    
    console.log(`Function ends at line ${endIdx+1}`);
    
    // New iOS-safe function
    const newLines = [
      '  const processFile = (file: File) => {',
      '    // iOS Safari compatibility: Support HEIC',
      '    const isImageType = file.type.startsWith(\'image/\') || ',
      '                        file.name.toLowerCase().endsWith(\'.heic\') || ',
      '                        file.name.toLowerCase().endsWith(\'.heif\')',
      '',
      '    if (!isImageType) {',
      '      alert(\'Only image files can be uploaded.\')',
      '      return',
      '    }',
      '',
      '    const maxSize = 20 * 1024 * 1024',
      '    if (file.size > maxSize) {',
      '      alert(\'File size must be less than 20MB.\')',
      '      return',
      '    }',
      '',
      '    setOriginalFile(file)',
      '    const reader = new FileReader()',
      '    ',
      '    reader.onerror = () => {',
      '      console.error(\'FileReader error:\', reader.error)',
      '      alert(\'Failed to read file. Please try again.\')',
      '    }',
      '',
      '    reader.onload = (e) => {',
      '      try {',
      '        const result = e.target?.result as string',
      '        ',
      '        if (!result || !result.startsWith(\'data:image/\')) {',
      '          alert(\'Invalid image format.\')',
      '          return',
      '        }',
      '',
      '        // Resize image to prevent display issues',
      '        const img = new Image()',
      '        img.onload = () => {',
      '          try {',
      '            const maxDim = 1920',
      '            let w = img.width',
      '            let h = img.height',
      '',
      '            if (w > maxDim || h > maxDim) {',
      '              if (w > h) {',
      '                h = (h * maxDim) / w',
      '                w = maxDim',
      '              } else {',
      '                w = (w * maxDim) / h',
      '                h = maxDim',
      '              }',
      '            }',
      '',
      '            const canvas = document.createElement(\'canvas\')',
      '            canvas.width = w',
      '            canvas.height = h',
      '            const ctx = canvas.getContext(\'2d\')',
      '',
      '            if (ctx) {',
      '              ctx.drawImage(img, 0, 0, w, h)',
      '              const resized = canvas.toDataURL(\'image/jpeg\', 0.85)',
      '              setCapturedImage(resized)',
      '              setMode(\'upload\')',
      '            } else {',
      '              setCapturedImage(result)',
      '              setMode(\'upload\')',
      '            }',
      '          } catch (err) {',
      '            console.error(\'Resize error:\', err)',
      '            setCapturedImage(result)',
      '            setMode(\'upload\')',
      '          }',
      '        }',
      '        ',
      '        img.onerror = () => {',
      '          alert(\'Failed to load image.\')',
      '        }',
      '        ',
      '        img.src = result',
      '      } catch (error) {',
      '        console.error(\'Error:\', error)',
      '        alert(\'Error processing image.\')',
      '      }',
      '    }',
      '',
      '    try {',
      '      reader.readAsDataURL(file)',
      '    } catch (error) {',
      '      alert(\'Error reading file.\')',
      '    }',
      '  }'
    ];
    
    // Replace
    lines.splice(i, endIdx - i + 1, ...newLines);
    console.log(`Replaced ${endIdx - i + 1} lines with ${newLines.length} lines`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Applied iOS-safe processFile with image resizing');
