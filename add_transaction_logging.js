const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find the line where transaction_tag is saved
for (let i = 0; i < lines.length; i++) {
  // Add logging before transaction_tag insert
  if (lines[i].includes('transaction_tag: transactionTags[0]')) {
    console.log(`Found transaction_tag at line ${i+1}`);
    // Add logging line before
    lines.splice(i, 0, '          // Saving code_value (not code_name)');
    lines.splice(i+1, 0, `          ...(console.log('[Review Save] Transaction Tag Code:', transactionTags[0]) || {}),`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Added logging for transaction_tag save');
