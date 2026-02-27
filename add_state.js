const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [showThankYouModal, setShowThankYouModal]')) {
    console.log(`Found showThankYouModal at line ${i+1}`);
    
    // Insert after this line
    const newLine = '  const [alertModal, setAlertModal] = useState<{ show: boolean; message: string }>({ show: false, message: \'\' })';
    lines.splice(i+1, 0, newLine);
    console.log(`Inserted alertModal state at line ${i+2}`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
