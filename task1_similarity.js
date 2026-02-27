const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Change similarity threshold from 0.3 to 0.85
const old = '.filter((c: any) => (c.matchScore || 0) >= 0.3)';
const newCode = '.filter((c: any) => (c.matchScore || 0) >= 0.85)';

if (content.includes(old)) {
  content = content.replace(old, newCode);
  console.log('Changed similarity threshold to 85%');
} else {
  console.log('Pattern not found');
}

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
