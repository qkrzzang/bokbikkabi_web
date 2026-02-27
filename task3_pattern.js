const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const indent = line.match(/^(\s*)/)[0];
  
  // Find setAlertModal with dailyLimit, monthlyLimit, userLimit
  if (line.includes('setAlertModal') && line.includes('message:')) {
    if (line.includes('dailyLimit')) {
      lines[i] = indent + "setAlertModal({ show: true, message: `You can submit up to \\${dailyLimit} reviews per day.\\nPlease try again tomorrow.` })";
      console.log(`Line ${i+1}: Replaced daily limit`);
      count++;
    } else if (line.includes('monthlyLimit')) {
      lines[i] = indent + "setAlertModal({ show: true, message: `You can submit up to \\${monthlyLimit} reviews per month.\\nPlease try again next month.` })";
      console.log(`Line ${i+1}: Replaced monthly limit`);
      count++;
    } else if (line.includes('userLimit')) {
      lines[i] = indent + "setAlertModal({ show: true, message: `You can submit up to \\${userLimit} reviews per account.` })";
      console.log(`Line ${i+1}: Replaced user limit`);
      count++;
    } else if (line.length < 120 && !line.includes('dailyLimit') && !line.includes('monthlyLimit') && !line.includes('userLimit') && !line.includes('error') && !line.includes('missingNames')) {
      // Short message likely "Login required"
      lines[i] = indent + "setAlertModal({ show: true, message: 'Login required.' })";
      console.log(`Line ${i+1}: Replaced login message`);
      count++;
    }
  }
  
  // Find console.error
  if (line.includes('console.error') && line.includes(',') && line.includes('error') && line.includes(':')) {
    // Check if it's a Korean message by looking for broken characters
    const hasKorean = /[\u3131-\uD79D]/.test(line) || line.includes('?귐됰윮') || line.includes('??곻폒');
    if (hasKorean || (line.length > 60 && line.length < 100)) {
      lines[i] = indent + "console.error('Review limit check error:', error)";
      console.log(`Line ${i+1}: Replaced console.error`);
      count++;
    }
  }
}

console.log(`Total replaced: ${count} lines`);
fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
