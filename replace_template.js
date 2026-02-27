const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Template literal replacements
const old1 = 'alert(`?섎（??理쒕? ${dailyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.\\n?댁씪 ?ㅼ떆 ?쒕룄?댁＜?몄슂.`)';
const new1 = 'setAlertModal({ show: true, message: `?섎（??理쒕? ${dailyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.\\n?댁씪 ?ㅼ떆 ?쒕룄?댁＜?몄슂.` })';

const old2 = 'alert(`???ъ뿉 理쒕? ${monthlyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.\\n?ㅼ쓬 ?ъ뿉 ?ㅼ떆 ?쒕룄?댁＜?몄슂.`)';
const new2 = 'setAlertModal({ show: true, message: `???ъ뿉 理쒕? ${monthlyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.\\n?ㅼ쓬 ?ъ뿉 ?ㅼ떆 ?쒕룄?댁＜?몄슂.` })';

const old3 = 'alert(`怨꾩젙??理쒕? ${userLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.`)';
const new3 = 'setAlertModal({ show: true, message: `怨꾩젙??理쒕? ${userLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.` })';

const old4 = 'alert(`紐⑤뱺 ?곸꽭 ?됯? ??ぉ???좏깮?댁＜?몄슂.\\n誘몄꽑????ぉ: ${missingNames}`)';
const new4 = 'setAlertModal({ show: true, message: `紐⑤뱺 ?곸꽭 ?됯? ??ぉ???좏깮?댁＜?몄슂.\\n誘몄꽑????ぉ: ${missingNames}` })';

const old5 = 'alert(`由щ럭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎: ${error.message}`)';
const new5 = 'setAlertModal({ show: true, message: `由щ럭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎: ${error.message}` })';

content = content.replace(old1, new1);
content = content.replace(old2, new2);
content = content.replace(old3, new3);
content = content.replace(old4, new4);
content = content.replace(old5, new5);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Done');
