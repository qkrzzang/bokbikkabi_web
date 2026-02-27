const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Remove line 1231 and 1233 (extra closing braces)
let removedCount = 0;

// Line 1231 (index 1230)
if (lines[1230] && lines[1230].trim() === '}') {
  console.log(`Removing extra brace at line 1231`);
  lines.splice(1230, 1);
  removedCount++;
}

// Line 1233 (now index 1231 after first removal)
if (lines[1231] && lines[1231].trim() === '}') {
  console.log(`Removing extra brace at line 1232 (original 1233)`);
  lines.splice(1231, 1);
  removedCount++;
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log(`Removed ${removedCount} extra closing braces`);
