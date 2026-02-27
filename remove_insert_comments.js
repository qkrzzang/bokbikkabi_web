const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Remove line 1323 and 1326 (comments inside insert object)
let removed = 0;

for (let i = 0; i < lines.length; i++) {
  // Line 1323: // Saving code_value (not code_name)
  if (lines[i].includes('// Saving code_value (not code_name)')) {
    console.log(`Removing comment at line ${i+1}`);
    lines.splice(i, 1);
    removed++;
    i--; // Adjust index after removal
  }
  
  // Line 1326: // Log: Saving code_value to transaction_tag
  if (lines[i].includes('// Log: Saving code_value to transaction_tag')) {
    console.log(`Removing comment at line ${i+1}`);
    lines.splice(i, 1);
    removed++;
    i--;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log(`Removed ${removed} problematic comments`);
