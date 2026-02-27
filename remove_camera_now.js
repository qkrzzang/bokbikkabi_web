const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

console.log('Total lines:', lines.length);

// Find line 1478 (0-indexed: 1477)
if (lines[1477] && lines[1477].includes('移대찓?쇰줈 珥ъ쁺')) {
  console.log('Found camera button at line 1478');
  
  // Go back to line 1450 (button start)
  console.log('Line 1450:', lines[1449]);
  console.log('Line 1479:', lines[1478]);
  
  // Delete from 1450 to 1479 (0-indexed: 1449 to 1478)
  lines.splice(1449, 30);
  console.log('Deleted 30 lines starting from 1450');
  
  fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
  console.log('CAMERA BUTTON REMOVED!');
} else {
  console.log('Line 1478 content:', lines[1477]);
}
