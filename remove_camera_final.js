const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find and remove camera button
let removed = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<span>移대찓?쇰줈 珥ъ쁺</span>')) {
    console.log(`Found camera button at line ${i+1}`);
    
    // Go back to find button start
    for (let j = i-1; j >= Math.max(0, i-35); j--) {
      if (lines[j].trim().startsWith('<button') && lines[j].includes('optionButton') && lines[j].includes('onClick')) {
        console.log(`Button starts at line ${j+1}`);
        
        // Find button end
        for (let k = j+1; k < Math.min(lines.length, j+40); k++) {
          if (lines[k].includes('</button>')) {
            console.log(`Button ends at line ${k+1}`);
            
            // Remove from j to k
            const deleteCount = k - j + 1;
            lines.splice(j, deleteCount);
            console.log(`Removed ${deleteCount} lines`);
            removed = true;
            break;
          }
        }
        break;
      }
    }
    break;
  }
}

if (removed) {
  fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
  console.log('SUCCESS: Camera button removed');
} else {
  console.log('Camera button not found');
}
