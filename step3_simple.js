const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleConfirm = () => {')) {
    console.log(`Found handleConfirm at line ${i+1}`);
    // Change to async
    lines[i] = '  const handleConfirm = async () => {';
    
    // Find closing brace
    for (let j = i+1; j < lines.length; j++) {
      if (lines[j].trim() === '}' && lines[j-1].includes("console.log('由щ럭 ?묒꽦 ?꾨줈?몄뒪 ?쒖옉')")) {
        // Insert auth and limit checks after if (!isAgreementChecked) block
        const insertLines = [
          '',
          '    // ?몄쬆 泥댄겕',
          '    if (!checkAuth()) return',
          '    if (!authUser?.id) {',
          "      setAlertModal({ show: true, message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??' })",
          '      return',
          '    }',
          '',
          '    // 由щ럭 ?쒗븳 泥댄겕',
          '    const canProceed = await checkReviewLimits()',
          '    if (!canProceed) {',
          '      return',
          '    }',
          ''
        ];
        
        // Insert after line that has 'return' after isAgreementChecked check
        for (let k = i+1; k < j; k++) {
          if (lines[k].includes('if (!isAgreementChecked)')) {
            // Find next line that has return
            let returnLine = k+1;
            while (returnLine < j && !lines[returnLine].includes('return')) {
              returnLine++;
            }
            // Insert after this return line
            lines.splice(returnLine + 1, 0, ...insertLines);
            console.log(`Inserted checks at line ${returnLine + 2}`);
            break;
          }
        }
        
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
