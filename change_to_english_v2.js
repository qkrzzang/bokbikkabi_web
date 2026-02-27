const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Track changes
let changeCount = 0;

for (let i = 0; i < lines.length; i++) {
  // Line 261: Login required
  if (i === 260 && lines[i].includes('setAlertModal')) {
    lines[i] = "        setAlertModal({ show: true, message: 'Login required.' })";
    console.log(`Line ${i+1}: Changed to English`);
    changeCount++;
  }
  
  // Line 312: Daily limit
  if (i === 311 && lines[i].includes('message:')) {
    lines[i] = "          message: `You can write up to ${dailyLimit} review(s) per day.\\nPlease try again tomorrow.`";
    console.log(`Line ${i+1}: Changed to English`);
    changeCount++;
  }
  
  // Line 336: Monthly limit
  if (i === 335 && lines[i].includes('message:')) {
    lines[i] = "          message: `You can write up to ${monthlyLimit} review(s) per month.\\nPlease try again next month.`";
    console.log(`Line ${i+1}: Changed to English`);
    changeCount++;
  }
  
  // Line 359: Total limit
  if (i === 358 && lines[i].includes('message:')) {
    lines[i] = "          message: `You have reached the maximum limit of ${totalLimit} reviews.`";
    console.log(`Line ${i+1}: Changed to English`);
    changeCount++;
  }
  
  // Line 384: Login required (handleConfirm)
  if (i === 383 && lines[i].includes('setAlertModal')) {
    lines[i] = "      setAlertModal({ show: true, message: 'Login required.' })";
    console.log(`Line ${i+1}: Changed to English`);
    changeCount++;
  }
  
  // Line 2230: Button text
  if (i === 2229 && lines[i].includes('button')) {
    lines[i] = "                OK";
    console.log(`Line ${i+1}: Changed to English`);
    changeCount++;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log(`Total changes: ${changeCount}`);
