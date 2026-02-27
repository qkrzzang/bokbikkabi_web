const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Remove the problematic logging lines
let removeIndices = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('...(console.log') && lines[i].includes('Transaction Tag')) {
    removeIndices.push(i);
    console.log(`Removing problematic line ${i+1}`);
  }
}

// Remove in reverse order to maintain indices
for (let i = removeIndices.length - 1; i >= 0; i--) {
  lines.splice(removeIndices[i], 1);
}

// Add simple logging before the insert
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('transaction_tag: transactionTags[0]')) {
    console.log(`Adding simple logging at line ${i+1}`);
    lines.splice(i, 0, `      console.log('[Review Save] Transaction Tag (code_value):', transactionTags[0])`);
    lines.splice(i+1, 0, '');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Fixed logging');
