const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Add logging before setAlertModal calls
content = content.replace(
  /if \(dailyCount >= dailyLimit\) \{\s+setAlertModal\(\{/g,
  `if (dailyCount >= dailyLimit) {
      console.log('[Review Limits] DAILY LIMIT EXCEEDED - Showing alert modal')
      setAlertModal({`
);

content = content.replace(
  /if \(monthlyCount >= monthlyLimit\) \{\s+setAlertModal\(\{/g,
  `if (monthlyCount >= monthlyLimit) {
      console.log('[Review Limits] MONTHLY LIMIT EXCEEDED - Showing alert modal')
      setAlertModal({`
);

content = content.replace(
  /if \(totalCount >= totalLimit\) \{\s+setAlertModal\(\{/g,
  `if (totalCount >= totalLimit) {
      console.log('[Review Limits] TOTAL LIMIT EXCEEDED - Showing alert modal')
      setAlertModal({`
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Added logging to alert modal calls');
