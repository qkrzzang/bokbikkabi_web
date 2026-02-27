const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Fix authUser null check by adding non-null assertion
content = content.replace(
  /\.eq\('supabase_user_id', authUser\.id\)\s+\.eq\('contract_date', contractDate\)/g,
  ".eq('supabase_user_id', authUser!.id)\n          .eq('contract_date', contractDate)"
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Fixed TypeScript null check');
