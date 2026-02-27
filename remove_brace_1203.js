const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Remove line 1203 (extra closing brace)
if (lines[1202] && lines[1202].trim() === '}') {
  console.log('Removing extra brace at line 1203');
  lines.splice(1202, 1);
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Removed extra closing brace');
