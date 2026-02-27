const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Fix: Change tag.code_name to tag.code_value in includes check
content = content.replace(
  /transactionTags\.includes\(tag\.code_name\)/g,
  'transactionTags.includes(tag.code_value)'
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Fixed: transaction tag selection now uses code_value');
