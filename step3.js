const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleConfirm = () => {')) {
    console.log(`Found handleConfirm at line ${i+1}`);
    
    // Change to async
    lines[i] = '  const handleConfirm = async () => {';
    
    // Add checks after isAgreementChecked check
    for (let j = i+1; j < i+10; j++) {
      if (lines[j] && lines[j].includes('return') && lines[j-1].includes('isAgreementChecked')) {
        const checks = [
          '',
          '    // Authentication check',
          '    if (!checkAuth()) return',
          '    if (!authUser?.id) {',
          "      setAlertModal({ show: true, message: 'Login required.' })",
          '      return',
          '    }',
          '',
          '    // Review limit check',
          '    const canProceed = await checkReviewLimits()',
          '    if (!canProceed) {',
          '      return',
          '    }',
          ''
        ];
        
        lines.splice(j+1, 0, ...checks);
        console.log('Added auth and review limit checks');
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Step 3: Updated handleConfirm');
