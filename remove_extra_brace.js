const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find and remove the extra closing brace at line 1229
for (let i = 0; i < lines.length; i++) {
  if (i === 1228 && lines[i].trim() === '}' && lines[i-1]?.includes('Passed - No duplicates')) {
    console.log(`Removing extra brace at line ${i+1}`);
    lines.splice(i, 1);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Removed extra closing brace');
