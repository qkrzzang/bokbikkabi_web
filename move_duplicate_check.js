const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Step 1: Remove the duplicate check section from current location (lines 1202-1230)
let duplicateCheckLines = [];
let removeStartIdx = -1;
let removeEndIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Check duplicate contract_date (LEASE can have multiple reviews on same date)')) {
    removeStartIdx = i;
  }
  if (removeStartIdx !== -1 && lines[i].includes('console.log(\'[Duplicate Check] SKIPPED - LEASE can have multiple reviews\')')) {
    removeEndIdx = i;
    break;
  }
}

if (removeStartIdx !== -1 && removeEndIdx !== -1) {
  console.log(`Extracting duplicate check from lines ${removeStartIdx + 1} to ${removeEndIdx + 1}`);
  duplicateCheckLines = lines.slice(removeStartIdx, removeEndIdx + 1);
  lines.splice(removeStartIdx, removeEndIdx - removeStartIdx + 1);
  console.log(`Removed ${removeEndIdx - removeStartIdx + 1} lines`);
}

// Step 2: Find where contractData is defined (now earlier line number)
let contractDataIdx = -1;
for (let i = 1200; i < 1300; i++) {
  if (lines[i]?.includes('const contractData = primaryContract') && i < 1280) {
    contractDataIdx = i;
    console.log(`Found contractData definition at line ${i + 1}`);
    break;
  }
}

// Step 3: Insert duplicate check right after contractData definition
if (contractDataIdx !== -1 && duplicateCheckLines.length > 0) {
  console.log(`Inserting duplicate check after line ${contractDataIdx + 1}`);
  lines.splice(contractDataIdx + 1, 0, '', ...duplicateCheckLines, '');
  console.log('Moved duplicate check to correct location');
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Successfully moved duplicate check logic');
