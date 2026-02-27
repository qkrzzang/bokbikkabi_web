const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Line 2230: Button text
if (lines[2229]) {
  lines[2229] = "                OK";
  console.log('Line 2230: Changed button text to OK');
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Button text updated');
