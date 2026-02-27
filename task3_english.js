const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Replace all Korean messages with English
const replacements = [
  // setAlertModal messages
  ["message: '?대?吏 ?뚯씪留??낅줈??媛?ν빀?덈떎.'", "message: 'Only image files can be uploaded.'"],
  ["message: '移대찓???묎렐 沅뚰븳???꾩슂?⑸땲?? 釉뚮씪?곗? ?ㅼ젙?먯꽌 移대찓??沅뚰븳???덉슜?댁＜?몄슂.'", "message: 'Camera access is required. Please allow camera permission in browser settings.'"],
  ["message: '移대찓?쇰? 李얠쓣 ???놁뒿?덈떎. 湲곌린??移대찓?쇨? ?곌껐?섏뼱 ?덈뒗吏 ?뺤씤?댁＜?몄슂.'", "message: 'Camera not found. Please check if camera is connected.'"],
  ["message: '?뚯씪??李얠쓣 ???놁뒿?덈떎.'", "message: 'File not found.'"],
  ["message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??'", "message: 'Login required.'"],
  ["message: '?곸꽭 由щ럭??20???댁긽 ?묒꽦?댁＜?몄슂.'", "message: 'Please write at least 20 characters for detailed review.'"],
  ["message: '嫄곕옒 ?쒓렇瑜??좏깮?댁＜?몄슂.'", "message: 'Please select transaction tags.'"],
  ["message: '移?갔 ?쒓렇 ?먮뒗 ?꾩돩? ?쒓렇 以?理쒖냼 1媛쒕? ?좏깮?댁＜?몄슂.'", "message: 'Please select at least one praise or regret tag.'"],
  ["message: '以묎컻?щТ???뺤씤???꾩슂?⑸땲?? ?꾨낫 以??섎굹瑜??좏깮?댁＜?몄슂.'", "message: 'Please select one of the agent candidates.'"],
  ["message: '以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.'", "message: 'Agent information not found. Please check again.'"],
  ["message: '由щ럭 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.'", "message: 'An error occurred while saving the review.'"],
  
  // Template literal messages
  ["message: `?섎（??理쒕? \\${dailyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.\\\\n?댁씪 ?ㅼ떆 ?쒕룄?댁＜?몄슂.`", "message: `You can submit up to \\${dailyLimit} reviews per day.\\\\nPlease try again tomorrow.`"],
  ["message: `???ъ뿉 理쒕? \\${monthlyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.\\\\n?ㅼ쓬 ?ъ뿉 ?ㅼ떆 ?쒕룄?댁＜?몄슂.`", "message: `You can submit up to \\${monthlyLimit} reviews per month.\\\\nPlease try again next month.`"],
  ["message: `怨꾩젙??理쒕? \\${userLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.`", "message: `You can submit up to \\${userLimit} reviews per account.`"],
  ["message: `紐⑤뱺 ?곸꽭 ?됯? ??ぉ???좏깮?댁＜?몄슂.\\\\n誘몄꽑????ぉ: \\${missingNames}`", "message: `Please select all evaluation items.\\\\nMissing: \\${missingNames}`"],
  ["message: `由щ럭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎: \\${error.message}`", "message: `Failed to save review: \\${error.message}`"],
  
  // Regular alert messages
  ["alert('?대?吏 ?뚯씪留??낅줈??媛?ν빀?덈떎.')", "setAlertModal({ show: true, message: 'Only image files can be uploaded.' })"],
  ["alert('移대찓???묎렐 沅뚰븳???꾩슂?⑸땲??')", "setAlertModal({ show: true, message: 'Camera access is required.' })"],
  ["alert('?뚯씪??李얠쓣 ???놁뒿?덈떎.')", "setAlertModal({ show: true, message: 'File not found.' })"],
  ["alert('濡쒓렇?몄씠 ?꾩슂?⑸땲??')", "setAlertModal({ show: true, message: 'Login required.' })"]
];

let count = 0;
for (const [oldText, newText] of replacements) {
  if (content.includes(oldText)) {
    content = content.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newText);
    count++;
  }
}

console.log(`Replaced ${count} messages to English`);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
