const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find the camera button and remove it
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<span>移대찓?쇰줈 珥ъ쁺</span>')) {
    console.log(`Found camera button text at line ${i+1}`);
    
    // Find button start (go back to find <button)
    for (let j = i-1; j >= Math.max(0, i-30); j--) {
      if (lines[j].trim().startsWith('<button') && lines[j].includes('optionButton')) {
        console.log(`Found button start at line ${j+1}`);
        
        // Find button end (</button>)
        for (let k = j; k <= Math.min(lines.length-1, j+35); k++) {
          if (lines[k].includes('</button>') && k > i) {
            console.log(`Found button end at line ${k+1}`);
            
            // Delete from j to k (inclusive)
            const deleteCount = k - j + 1;
            lines.splice(j, deleteCount);
            console.log(`Deleted ${deleteCount} lines from ${j+1} to ${k+1}`);
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
console.log('Task 1: Removed camera button on mobile');
