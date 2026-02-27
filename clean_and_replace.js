const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find handleReviewSubmit
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleReviewSubmit = async () => {')) {
    console.log(`Found handleReviewSubmit at line ${i+1}`);
    
    // Find and remove the review limit check block (from "由щ럭 ?쒗븳 ?뺤콉 ?뺤씤" comment to the last limit check)
    for (let j = i; j < Math.min(i + 200, lines.length); j++) {
      if (lines[j].includes('// 由щ럭 ?쒗븳 ?뺤콉 ?뺤씤')) {
        // Find the end of limit checks (line with userLimit check)
        for (let k = j; k < Math.min(j + 100, lines.length); k++) {
          if (lines[k].includes('怨꾩젙??理쒕?') && lines[k].includes('alert')) {
            // Delete from j-1 (blank line before comment) to k+2 (return statement and blank line after)
            const deleteStart = j - 1;
            const deleteEnd = k + 3; // Include return statement and blank line
            console.log(`Removing lines ${deleteStart+1} to ${deleteEnd+1}`);
            lines.splice(deleteStart, deleteEnd - deleteStart);
            break;
          }
        }
        break;
      }
    }
    break;
  }
}

// Replace all alert() with setAlertModal()
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('alert(') && !lines[i].includes('setAlert')) {
    const indent = lines[i].match(/^(\s*)/)[0];
    
    if (lines[i].includes('?대?吏 ?뚯씪留?)) {
      lines[i] = indent + "setAlertModal({ show: true, message: '?대?吏 ?뚯씪留??낅줈??媛?ν빀?덈떎.' })";
    } else if (lines[i].includes('移대찓???묎렐 沅뚰븳')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '移대찓???묎렐 沅뚰븳???꾩슂?⑸땲?? 釉뚮씪?곗? ?ㅼ젙?먯꽌 移대찓??沅뚰븳???덉슜?댁＜?몄슂.' })";
    } else if (lines[i].includes('移대찓?쇰? 李얠쓣 ???놁뒿?덈떎')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '移대찓?쇰? 李얠쓣 ???놁뒿?덈떎. 湲곌린??移대찓?쇨? ?곌껐?섏뼱 ?덈뒗吏 ?뺤씤?댁＜?몄슂.' })";
    } else if (lines[i].includes('移대찓???ㅽ뻾 以?)) {
      lines[i] = indent + "setAlertModal({ show: true, message: `移대찓???ㅽ뻾 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ${errorMessage}` })";
    } else if (lines[i].includes('?뚯씪??李얠쓣 ???놁뒿?덈떎')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '?뚯씪??李얠쓣 ???놁뒿?덈떎.' })";
    } else if (lines[i].includes('濡쒓렇?몄씠 ?꾩슂?⑸땲??)) {
      lines[i] = indent + "setAlertModal({ show: true, message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??' })";
    } else if (lines[i].includes('20???댁긽')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '?곸꽭 由щ럭??20???댁긽 ?묒꽦?댁＜?몄슂.' })";
    } else if (lines[i].includes('嫄곕옒 ?쒓렇瑜??좏깮')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '嫄곕옒 ?쒓렇瑜??좏깮?댁＜?몄슂.' })";
    } else if (lines[i].includes('移?갔 ?쒓렇 ?먮뒗')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '移?갔 ?쒓렇 ?먮뒗 ?꾩돩? ?쒓렇 以?理쒖냼 1媛쒕? ?좏깮?댁＜?몄슂.' })";
    } else if (lines[i].includes('紐⑤뱺 ?곸꽭 ?됯?')) {
      lines[i] = indent + "setAlertModal({ show: true, message: `紐⑤뱺 ?곸꽭 ?됯? ??ぉ???좏깮?댁＜?몄슂.\\n誘몄꽑????ぉ: ${missingNames}` })";
    } else if (lines[i].includes('以묎컻?щТ???뺤씤???꾩슂')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '以묎컻?щТ???뺤씤???꾩슂?⑸땲?? ?꾨낫 以??섎굹瑜??좏깮?댁＜?몄슂.' })";
    } else if (lines[i].includes('以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.' })";
    } else if (lines[i].includes('由щ럭 ??μ뿉 ?ㅽ뙣')) {
      lines[i] = indent + "setAlertModal({ show: true, message: `由щ럭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎: ${error.message}` })";
    } else if (lines[i].includes('由щ럭 ???以??ㅻ쪟')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '由щ럭 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' })";
    } else if (lines[i].includes('以묎컻?щТ???뺣낫瑜?李얠쓣 ???놁뒿?덈떎')) {
      lines[i] = indent + "setAlertModal({ show: true, message: '以묎컻?щТ???뺣낫瑜?李얠쓣 ???놁뒿?덈떎.\\n\\n怨좉컼?쇳꽣 ?먮뒗 愿由ъ옄?먭쾶 臾몄쓽?댁＜?몄슂.' })";
    }
  }
}

console.log('Replaced alerts');
fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
