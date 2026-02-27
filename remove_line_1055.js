const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Remove line 1055 (index 1054)
if (lines[1054]) {
  console.log(`Line 1055 before removal: "${lines[1054]}"`);
  lines.splice(1054, 1);
  console.log('Removed line 1055');
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
