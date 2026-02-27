const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<span>移대찓?쇰줈 珥ъ쁺</span>')) {
    console.log(`Found camera button at line ${i+1}`);
    
    // Find the button start (should be 19 lines before the span)
    for (let j = i-1; j >= i-25; j--) {
      if (lines[j] && lines[j].trim().startsWith('<button') && lines[j].includes('optionButton')) {
        console.log(`Found button start at line ${j+1}`);
        
        // Add isMobile check
        lines[j] = '                      {!isMobile && (';
        lines[j] = lines[j] + '\n                      <button';
        
        // Find button end
        for (let k = j+1; k < i+5; k++) {
          if (lines[k] && lines[k].includes('</button>')) {
            lines[k] = lines[k] + '\n                      )}';
            console.log(`Added mobile check from line ${j+1} to ${k+1}`);
            break;
          }
        }
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Step 4: Hidden camera button on mobile');
