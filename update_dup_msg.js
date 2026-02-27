const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find the alert message line
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Only LEASE transactions can have multiple reviews')) {
    console.log(`Found alert message at line ${i+1}`);
    
    // Find the start of the if block to insert the code_name lookup
    let insertIdx = i - 2;
    while (insertIdx > 0 && !lines[insertIdx].includes('if (!duplicateError && existingReviews')) {
      insertIdx--;
    }
    
    if (insertIdx > 0) {
      console.log(`Inserting code_name lookup before line ${insertIdx+2}`);
      // Insert the lookup for LEASE code_name
      lines.splice(insertIdx + 1, 0, '          const leaseTagName = transactionTagOptions.find(tag => tag.code_value === \'LEASE\')?.code_name || \'LEASE\'');
      
      // Now find and update the alert message (now shifted by 1 line)
      for (let j = insertIdx; j < insertIdx + 10; j++) {
        if (lines[j].includes('Only LEASE transactions can have multiple reviews')) {
          console.log(`Updating message at line ${j+1}`);
          lines[j] = lines[j].replace(
            'Only LEASE transactions can have multiple reviews on the same date.',
            'Only ${leaseTagName} transactions can have multiple reviews on the same date.'
          );
          // Fix the template literal
          lines[j] = lines[j].replace(/alert\(`([^`]+)`\)/, 'alert(`$1`)');
          break;
        }
      }
    }
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Updated duplicate check message to use Korean tag name');
