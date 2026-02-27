const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Fix type issues
content = content.replace(
  /const dailyLimit = parseInt\(policies\?\.find\(p => p\.code_value === 'DAILY_LIMIT'\)/g,
  "const dailyLimit = parseInt(policies?.find((p: any) => p.code_value === 'DAILY_LIMIT')"
);

content = content.replace(
  /const monthlyLimit = parseInt\(policies\?\.find\(p => p\.code_value === 'MONTHLY_LIMIT'\)/g,
  "const monthlyLimit = parseInt(policies?.find((p: any) => p.code_value === 'MONTHLY_LIMIT')"
);

content = content.replace(
  /const totalLimit = parseInt\(policies\?\.find\(p => p\.code_value === 'USER_LIMIT'\)/g,
  "const totalLimit = parseInt(policies?.find((p: any) => p.code_value === 'USER_LIMIT')"
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Fixed TypeScript types');
