const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Add closing brace after line 1200 (return statement)
if (lines[1199] && lines[1199].includes('return')) {
  console.log('Adding closing brace after line 1200');
  lines.splice(1200, 0, '      }');
  console.log('Added closing brace');
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Fixed missing closing brace');
