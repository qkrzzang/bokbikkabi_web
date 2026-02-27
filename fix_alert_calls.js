const fs = require('fs');
const content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace setAlertModal with alert in processFile
let newContent = content;
newContent = newContent.replace(/setAlertModal\(\{ show: true, message: '([^']+)' \}\)/g, "alert('`1')");

if (newContent !== content) {
  fs.writeFileSync('components/CameraButton.tsx', newContent, 'utf8');
  console.log('Replaced setAlertModal with alert');
} else {
  console.log('No replacements made');
}
