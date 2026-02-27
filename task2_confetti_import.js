const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find the last import and add confetti
for (let i = 0; i < 20; i++) {
  if (lines[i].startsWith('import') && lines[i+1] && !lines[i+1].startsWith('import')) {
    console.log(`Found last import at line ${i+1}`);
    lines.splice(i+1, 0, "import confetti from 'canvas-confetti'");
    console.log('Added confetti import');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
