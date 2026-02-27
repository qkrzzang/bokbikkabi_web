const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleConfirm = () => {')) {
    console.log(`Found handleConfirm at line ${i+1}`);
    
    // Find the end of this function
    let endIdx = i;
    let braceCount = 0;
    for (let j = i; j < lines.length; j++) {
      for (const char of lines[j]) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      if (braceCount === 0 && j > i) {
        endIdx = j;
        break;
      }
    }
    
    console.log(`Function ends at line ${endIdx+1}`);
    
    const newFunc = [
      '  const handleConfirm = async () => {',
      '    if (!isAgreementChecked) {',
      '      return',
      '    }',
      '',
      '    // Check authentication',
      '    if (!checkAuth()) return',
      '',
      '    const supabase = createClientComponentClient()',
      '    const { data: { user: authUser } } = await supabase.auth.getUser()',
      '',
      '    if (!authUser?.id) {',
      '      setAlertModal({ show: true, message: \'Login required.\' })',
      '      return',
      '    }',
      '',
      '    // Check review limits',
      '    const canProceed = await checkReviewLimits()',
      '    if (!canProceed) {',
      '      setIsConfirmModalOpen(false)',
      '      setIsAgreementChecked(false)',
      '      return',
      '    }',
      '',
      '    setIsConfirmModalOpen(false)',
      '    setIsAgreementChecked(false)',
      '    setIsOpen(true)',
      '    setMode(\'select\')',
      '    setCapturedImage(null)',
      '    console.log(\'Review process started\')',
      '  }'
    ];
    
    lines.splice(i, endIdx - i + 1, ...newFunc);
    console.log(`Replaced handleConfirm with async version`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
