const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Fix column name: group_code -> code_group
content = content.replace(
  /\.eq\('group_code', 'REVIEW_POLICY'\)/g,
  ".eq('code_group', 'REVIEW_POLICY')"
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Fixed column name: group_code -> code_group');
