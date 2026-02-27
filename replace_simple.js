const fs = require('fs');
let content = fs.readFileSync('components/CameraButton.tsx', 'utf8');

// Simple replacements
const old1 = "alert('?대?吏 ?뚯씪留??낅줈??媛?ν빀?덈떎.')";
const new1 = "setAlertModal({ show: true, message: '?대?吏 ?뚯씪留??낅줈??媛?ν빀?덈떎.' })";

const old2 = "alert('移대찓???묎렐 沅뚰븳???꾩슂?⑸땲??')";
const new2 = "setAlertModal({ show: true, message: '移대찓???묎렐 沅뚰븳???꾩슂?⑸땲??' })";

const old3 = "alert('?뚯씪??李얠쓣 ???놁뒿?덈떎.')";
const new3 = "setAlertModal({ show: true, message: '?뚯씪??李얠쓣 ???놁뒿?덈떎.' })";

const old4 = "alert('濡쒓렇?몄씠 ?꾩슂?⑸땲??')";
const new4 = "setAlertModal({ show: true, message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??' })";

const old5 = "alert('?곸꽭 由щ럭??20???댁긽 ?묒꽦?댁＜?몄슂.')";
const new5 = "setAlertModal({ show: true, message: '?곸꽭 由щ럭??20???댁긽 ?묒꽦?댁＜?몄슂.' })";

const old6 = "alert('嫄곕옒 ?쒓렇瑜??좏깮?댁＜?몄슂.')";
const new6 = "setAlertModal({ show: true, message: '嫄곕옒 ?쒓렇瑜??좏깮?댁＜?몄슂.' })";

const old7 = "alert('移?갔 ?쒓렇 ?먮뒗 ?꾩돩? ?쒓렇 以?理쒖냼 1媛쒕? ?좏깮?댁＜?몄슂.')";
const new7 = "setAlertModal({ show: true, message: '移?갔 ?쒓렇 ?먮뒗 ?꾩돩? ?쒓렇 以?理쒖냼 1媛쒕? ?좏깮?댁＜?몄슂.' })";

const old8 = "alert('以묎컻?щТ???뺤씤???꾩슂?⑸땲?? ?꾨낫 以??섎굹瑜??좏깮?댁＜?몄슂.')";
const new8 = "setAlertModal({ show: true, message: '以묎컻?щТ???뺤씤???꾩슂?⑸땲?? ?꾨낫 以??섎굹瑜??좏깮?댁＜?몄슂.' })";

const old9 = "alert('以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.')";
const new9 = "setAlertModal({ show: true, message: '以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.' })";

const old10 = "alert('由щ럭 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.')";
const new10 = "setAlertModal({ show: true, message: '由щ럭 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' })";

content = content.replace(old1, new1);
content = content.replace(old2, new2);
content = content.replace(old3, new3);
content = content.replace(old4, new4);
content = content.replace(old5, new5);
content = content.replace(old6, new6);
content = content.replace(old7, new7);
content = content.replace(old8, new8);
content = content.replace(old9, new9);
content = content.replace(old10, new10);

fs.writeFileSync('components/CameraButton.tsx', content, 'utf8');
console.log('Done');
