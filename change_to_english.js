const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// 1. Login required messages (2 places)
content = content.replace(
  /setAlertModal\(\{ show: true, message: '嚥≪뮄???紐꾩뵠 \?袁⑹뒄\??몃빍\?\?' \}\)/g,
  "setAlertModal({ show: true, message: 'Login required.' })"
);

// 2. Daily limit message
content = content.replace(
  /message: `\?占쎈（ 理?占?? \$\{dailyLimit\}媛쒖쓽 由щ럭\占??\?占쎌꽦\?\?\?\?\?占쎌뒿\?占쎈떎\.\\n\?占쎌씪 \?占쎌떆 \?占쎈룄\?占쎌＜\?占쎌슂\.`/g,
  "message: `You can write up to \${dailyLimit} review(s) per day.\\nPlease try again tomorrow.`"
);

// 3. Monthly limit message
content = content.replace(
  /message: `\?\?\?\?理?占?? \$\{monthlyLimit\}媛쒖쓽 由щ럭\占??\?占쎌꽦\?\?\?\?\?占쎌뒿\?占쎈떎\.\\n\?占쎌쓬 \?占쎌뿉 \?占쎌떆 \?占쎈룄\?占쎌＜\?占쎌슂\.`/g,
  "message: `You can write up to \${monthlyLimit} review(s) per month.\\nPlease try again next month.`"
);

// 4. Total limit message
content = content.replace(
  /message: `理?占?? \$\{totalLimit\}媛쒖쓽 由щ럭 \?占쎌꽦 \?占쏀븳\?\?\?占쎈떖\?占쎌뒿\?占쎈떎\.`/g,
  "message: `You have reached the maximum limit of \${totalLimit} reviews.`"
);

// 5. Button text (?뺤씤 -> OK)
content = content.replace(
  /\?類ㅼ뵥<\/button>/g,
  "OK</button>"
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Changed all messages to English');
