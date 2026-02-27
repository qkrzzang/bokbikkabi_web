const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Remove empty line 1323
if (lines[1322] && lines[1322].trim() === '' && 
    lines[1321]?.includes('supabase_user_id') && 
    lines[1323]?.includes('transaction_tag')) {
  console.log('Removing empty line 1323');
  lines.splice(1322, 1);
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Removed empty line inside insert object');
