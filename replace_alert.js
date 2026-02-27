const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace setAlertModal with alert
content = content.replace(
  /setAlertModal\(\s*\{\s*show:\s*true,\s*message:\s*`([^`]+)`\s*\}\s*\)/g,
  'alert(`$1`)'
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Replaced setAlertModal with alert');
