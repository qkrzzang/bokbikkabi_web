const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Update SELECT to include extra_value1
content = content.replace(
  /\.select\('code_value, code_name'\)/g,
  ".select('code_value, code_name, extra_value1')"
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Added extra_value1 to SELECT query');
