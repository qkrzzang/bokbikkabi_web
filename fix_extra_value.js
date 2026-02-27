const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace code_name with extra_value1 for limits
content = content.replace(
  /policies\?\.find\(\(p: any\) => p\.code_value === 'DAILY_LIMIT'\)\?\.code_name/g,
  "policies?.find((p: any) => p.code_value === 'DAILY_LIMIT')?.extra_value1"
);

content = content.replace(
  /policies\?\.find\(\(p: any\) => p\.code_value === 'MONTHLY_LIMIT'\)\?\.code_name/g,
  "policies?.find((p: any) => p.code_value === 'MONTHLY_LIMIT')?.extra_value1"
);

content = content.replace(
  /policies\?\.find\(\(p: any\) => p\.code_value === 'USER_LIMIT'\)\?\.code_name/g,
  "policies?.find((p: any) => p.code_value === 'USER_LIMIT')?.extra_value1"
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Fixed: code_name -> extra_value1');
