const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

let foundFirst = false;
let removeIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [alertModal, setAlertModal]')) {
    if (!foundFirst) {
      foundFirst = true;
      console.log(`First alertModal at line ${i+1} - KEEP`);
    } else {
      removeIdx = i;
      console.log(`Duplicate alertModal at line ${i+1} - REMOVE`);
      break;
    }
  }
}

if (removeIdx >= 0) {
  lines.splice(removeIdx, 1);
  console.log(`Removed line ${removeIdx+1}`);
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
