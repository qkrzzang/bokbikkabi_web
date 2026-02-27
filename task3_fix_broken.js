const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Find lines with setAlertModal and broken Korean
  if (line.includes('setAlertModal') && line.includes('message:')) {
    const indent = line.match(/^(\s*)/)[0];
    
    if (line.includes('dailyLimit')) {
      lines[i] = indent + "setAlertModal({ show: true, message: `You can submit up to \\${dailyLimit} reviews per day.\\nPlease try again tomorrow.` })";
      console.log(`Line ${i+1}: Replaced daily limit message`);
      count++;
    } else if (line.includes('monthlyLimit')) {
      lines[i] = indent + "setAlertModal({ show: true, message: `You can submit up to \\${monthlyLimit} reviews per month.\\nPlease try again next month.` })";
      console.log(`Line ${i+1}: Replaced monthly limit message`);
      count++;
    } else if (line.includes('userLimit')) {
      lines[i] = indent + "setAlertModal({ show: true, message: `You can submit up to \\${userLimit} reviews per account.` })";
      console.log(`Line ${i+1}: Replaced user limit message`);
      count++;
    } else if (line.includes('濡쒓렇?몄씠 ?꾩슂?⑸땲??) || line.includes('嚥≪뮄??)) {
      lines[i] = indent + "setAlertModal({ show: true, message: 'Login required.' })";
      console.log(`Line ${i+1}: Replaced login message`);
      count++;
    }
  }
  
  // Find console.error with Korean
  if (line.includes('console.error') && (line.includes('由щ럭') || line.includes('?귐됰윮'))) {
    const indent = line.match(/^(\s*)/)[0];
    lines[i] = indent + "console.error('Review limit check error:', error)";
    console.log(`Line ${i+1}: Replaced console.error message`);
    count++;
  }
}

console.log(`Total replaced: ${count} lines`);

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
