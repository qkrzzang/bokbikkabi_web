const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace setTransactionTags([tag.code_name]) with setTransactionTags([tag.code_value])
content = content.replace(
  /setTransactionTags\(\[tag\.code_name\]\)/g,
  'setTransactionTags([tag.code_value])'
);

// Also add logging to verify code_value is being saved
content = content.replace(
  /(transaction_tag: transactionTags\[0\] \|\| null,)/,
  `transaction_tag: transactionTags[0] || null,
          // Log: Saving code_value to transaction_tag
          ...(console.log('[Review Save] Transaction Tag (code_value):', transactionTags[0]) || {}),`
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Fixed: transaction_tag now saves code_value instead of code_name');
