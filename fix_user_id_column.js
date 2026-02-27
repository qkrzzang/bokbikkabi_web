const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace all user_id with supabase_user_id in agent_reviews queries
content = content.replace(
  /\.eq\('user_id', authUser\.id\)/g,
  ".eq('supabase_user_id', authUser.id)"
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Fixed: user_id -> supabase_user_id');
