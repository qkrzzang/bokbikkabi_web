const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace English messages with Korean
content = content.replace(
  /message: 'Login required\.'/g,
  "message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??'"
);

content = content.replace(
  /message: `You can submit up to \$\{dailyLimit\} reviews per day\.\\nPlease try again tomorrow\.`/g,
  "message: `?섎（ 理쒕? ${dailyLimit}媛쒖쓽 由щ럭瑜??묒꽦?????덉뒿?덈떎.\\n?댁씪 ?ㅼ떆 ?쒕룄?댁＜?몄슂.`"
);

content = content.replace(
  /message: `You can submit up to \$\{monthlyLimit\} reviews per month\.\\nPlease try again next month\.`/g,
  "message: `????理쒕? ${monthlyLimit}媛쒖쓽 由щ럭瑜??묒꽦?????덉뒿?덈떎.\\n?ㅼ쓬 ?ъ뿉 ?ㅼ떆 ?쒕룄?댁＜?몄슂.`"
);

content = content.replace(
  /message: `You have reached the maximum of \$\{totalLimit\} reviews\.`/g,
  "message: `理쒕? ${totalLimit}媛쒖쓽 由щ럭 ?묒꽦 ?쒗븳???꾨떖?덉뒿?덈떎.`"
);

// Add more detailed logging before the condition check
content = content.replace(
  /console\.log\('\[Review Limits\] Daily count:', dailyCount, '\/', dailyLimit\)/g,
  "console.log('[Review Limits] Daily count:', dailyCount, '/', dailyLimit)\n      console.log('[Review Limits] Checking condition: dailyCount >= dailyLimit:', dailyCount >= dailyLimit)"
);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Changed messages to Korean and added detailed logging');
