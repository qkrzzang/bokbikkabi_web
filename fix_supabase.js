const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace createClientComponentClient with supabase
content = content.replace(
  /const supabase = createClientComponentClient\(\)/g,
  '// Using imported supabase client'
);

// Remove the duplicate supabase.auth.getUser in checkReviewLimits
content = content.replace(
  /const checkReviewLimits = async \(\): Promise<boolean> => \{\s+try \{\s+\/\/ Using imported supabase client\s+const \{ data: \{ user: authUser \} \} = await supabase\.auth\.getUser\(\)/,
  'const checkReviewLimits = async (): Promise<boolean> => {\n    try {\n      if (!authUser?.id) {\n        setAlertModal({ show: true, message: \'Login required.\' })\n        return false\n      }'
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Fixed supabase usage');
