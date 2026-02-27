const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Remove the misplaced logging line
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("console.log('[Review Save] Transaction Tag")) {
    console.log(`Removing line ${i+1}`);
    lines.splice(i, 1);
    break;
  }
}

// Add logging before the insert statement
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const { error } = await supabase') && lines[i+1]?.includes('.from(\'agent_reviews\')')) {
    console.log(`Adding logging at line ${i+1}`);
    lines.splice(i, 0, '      console.log(\'[Review Save] Transaction Tag (code_value):\', transactionTags[0])');
    lines.splice(i+1, 0, '');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Fixed: moved logging before insert');
