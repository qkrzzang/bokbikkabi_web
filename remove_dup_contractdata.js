const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find and remove line 1204: const contractData = primaryContract
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const contractData = primaryContract') && 
      i > 1200 && i < 1210) {
    console.log(`Removing duplicate contractData at line ${i+1}`);
    // Replace with just blank line to maintain structure
    lines[i] = '';
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Removed duplicate contractData definition in duplicate check section');
