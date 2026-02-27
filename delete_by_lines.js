const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

console.log('Total lines before:', lines.length);

// Delete lines 1450-1479 (0-indexed: 1449-1478)
// This is the camera button block
const startIdx = 1449;
const endIdx = 1479;
const deleteCount = endIdx - startIdx;

console.log(`Deleting lines ${startIdx+1} to ${endIdx} (${deleteCount} lines)`);
lines.splice(startIdx, deleteCount);

console.log('Total lines after:', lines.length);

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('DELETED CAMERA BUTTON BY LINE NUMBERS');
