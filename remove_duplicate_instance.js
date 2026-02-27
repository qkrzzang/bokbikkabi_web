const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find and remove the second instance of duplicate check (around line 1055)
let firstFound = false;
let removeStart = -1;
let removeEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Check duplicate contract_date (only LEASE can have multiple reviews on same date)')) {
    if (!firstFound) {
      firstFound = true;
      console.log(`Keeping first instance at line ${i+1}`);
    } else {
      removeStart = i;
      console.log(`Found second instance at line ${i+1}, will remove`);
      
      // Find the end of this block
      for (let j = i; j < i + 40; j++) {
        if (lines[j].includes('console.log(\'[Duplicate Check] SKIPPED - LEASE can have multiple reviews\')')) {
          removeEnd = j;
          break;
        }
      }
      break;
    }
  }
}

if (removeStart !== -1 && removeEnd !== -1) {
  console.log(`Removing lines ${removeStart + 1} to ${removeEnd + 1}`);
  lines.splice(removeStart, removeEnd - removeStart + 1);
  console.log('Removed duplicate instance');
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Fixed duplicate code');
