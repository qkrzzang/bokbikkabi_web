const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

console.log('Total lines:', lines.length);
console.log('Checking line 1478:', lines[1477]);

// Check if camera button exists
let foundLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('移대찓?쇰줈 珥ъ쁺')) {
    foundLine = i;
    console.log(`Found camera text at line ${i+1}`);
    break;
  }
}

if (foundLine > 0) {
  // Find button start
  let buttonStart = -1;
  for (let j = foundLine; j >= Math.max(0, foundLine - 35); j--) {
    if (lines[j].includes('<button') && lines[j].includes('optionButton')) {
      buttonStart = j;
      console.log(`Button starts at line ${j+1}`);
      break;
    }
  }
  
  // Find button end
  let buttonEnd = -1;
  for (let k = foundLine; k < Math.min(lines.length, foundLine + 10); k++) {
    if (lines[k].includes('</button>')) {
      buttonEnd = k;
      console.log(`Button ends at line ${k+1}`);
      break;
    }
  }
  
  if (buttonStart >= 0 && buttonEnd >= 0) {
    const deleteCount = buttonEnd - buttonStart + 1;
    console.log(`Deleting ${deleteCount} lines from ${buttonStart+1} to ${buttonEnd+1}`);
    lines.splice(buttonStart, deleteCount);
    
    fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
    console.log('CAMERA BUTTON SUCCESSFULLY REMOVED!');
  }
} else {
  console.log('Camera button not found');
}
