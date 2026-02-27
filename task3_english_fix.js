const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Replace broken Korean messages with English
const replacements = [
  {line: 202, search: "message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??'", replace: "message: 'Login required.'"},
  {line: 256, search: /message: `.+dailyLimit.+`/, replace: "message: `You can submit up to ${dailyLimit} reviews per day.\\nPlease try again tomorrow.`"},
  {line: 267, search: /message: `.+monthlyLimit.+`/, replace: "message: `You can submit up to ${monthlyLimit} reviews per month.\\nPlease try again next month.`"},
  {line: 277, search: /message: `.+userLimit.+`/, replace: "message: `You can submit up to ${userLimit} reviews per account.`"},
  {line: 283, search: "'由щ럭 ?쒗븳 泥댄겕 ?ㅻ쪟:'", replace: "'Review limit check error:'"}
];

let count = 0;
for (const {line, search, replace} of replacements) {
  if (line < lines.length) {
    const lineIdx = line - 1;
    if (typeof search === 'string') {
      if (lines[lineIdx].includes(search) || lines[lineIdx].includes('message:')) {
        const indent = lines[lineIdx].match(/^(\s*)/)[0];
        if (search.includes('dailyLimit')) {
          lines[lineIdx] = indent + "setAlertModal({ show: true, message: `You can submit up to ${dailyLimit} reviews per day.\\nPlease try again tomorrow.` })";
        } else if (search.includes('monthlyLimit')) {
          lines[lineIdx] = indent + "setAlertModal({ show: true, message: `You can submit up to ${monthlyLimit} reviews per month.\\nPlease try again next month.` })";
        } else if (search.includes('userLimit')) {
          lines[lineIdx] = indent + "setAlertModal({ show: true, message: `You can submit up to ${userLimit} reviews per account.` })";
        } else if (search === "message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??'") {
          lines[lineIdx] = lines[lineIdx].replace(search, replace);
        } else if (search.includes('由щ럭 ?쒗븳 泥댄겕')) {
          lines[lineIdx] = indent + "console.error('Review limit check error:', error)";
        }
        count++;
        console.log(`Replaced line ${line}`);
      }
    } else {
      if (search.test(lines[lineIdx])) {
        const indent = lines[lineIdx].match(/^(\s*)/)[0];
        lines[lineIdx] = indent + "setAlertModal({ show: true, " + replace + " })";
        count++;
        console.log(`Replaced line ${line}`);
      }
    }
  }
}

console.log(`Total replaced: ${count} lines`);

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
