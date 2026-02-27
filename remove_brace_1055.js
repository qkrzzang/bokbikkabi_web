const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Remove line 1055 (extra closing brace)
if (lines[1054] && lines[1054].trim() === '}' && 
    lines[1053]?.trim() === '' &&
    lines[1056]?.trim() === '') {
  console.log('Removing extra brace at line 1055');
  lines.splice(1054, 1);
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Removed extra closing brace');
