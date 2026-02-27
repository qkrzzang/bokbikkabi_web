import codecs

with codecs.open("components/CameraButton.tsx", "r", "utf-8-sig") as f:
    lines = f.readlines()

count = 0
for i in range(len(lines)):
    if "alert(" in lines[i] and "setAlert" not in lines[i]:
        indent = " " * (len(lines[i]) - len(lines[i].lstrip()))
        old_line = lines[i]
        
        # Replace based on content
        if "?대?吏 ?뚯씪留? in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '?대?吏 ?뚯씪留??낅줈??媛?ν빀?덈떎.' })\n"
            count += 1
        elif "移대찓???묎렐 沅뚰븳" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '移대찓???묎렐 沅뚰븳???꾩슂?⑸땲?? 釉뚮씪?곗? ?ㅼ젙?먯꽌 移대찓??沅뚰븳???덉슜?댁＜?몄슂.' })\n"
            count += 1
        elif "移대찓?쇰? 李얠쓣 ???놁뒿?덈떎" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '移대찓?쇰? 李얠쓣 ???놁뒿?덈떎. 湲곌린??移대찓?쇨? ?곌껐?섏뼱 ?덈뒗吏 ?뺤씤?댁＜?몄슂.' })\n"
            count += 1
        elif "移대찓???ㅽ뻾 以? in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: `移대찓???ㅽ뻾 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ${errorMessage}` })\n"
            count += 1
        elif "?뚯씪??李얠쓣 ???놁뒿?덈떎" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '?뚯씪??李얠쓣 ???놁뒿?덈떎.' })\n"
            count += 1
        elif "濡쒓렇?몄씠 ?꾩슂?⑸땲?? in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??' })\n"
            count += 1
        elif "20???댁긽" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '?곸꽭 由щ럭??20???댁긽 ?묒꽦?댁＜?몄슂.' })\n"
            count += 1
        elif "嫄곕옒 ?쒓렇瑜??좏깮" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '嫄곕옒 ?쒓렇瑜??좏깮?댁＜?몄슂.' })\n"
            count += 1
        elif "移?갔 ?쒓렇 ?먮뒗 ?꾩돩? ?쒓렇" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '移?갔 ?쒓렇 ?먮뒗 ?꾩돩? ?쒓렇 以?理쒖냼 1媛쒕? ?좏깮?댁＜?몄슂.' })\n"
            count += 1
        elif "紐⑤뱺 ?곸꽭 ?됯?" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: `紐⑤뱺 ?곸꽭 ?됯? ??ぉ???좏깮?댁＜?몄슂.\\n誘몄꽑????ぉ: ${missingNames}` })\n"
            count += 1
        elif "以묎컻?щТ???뺤씤???꾩슂" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '以묎컻?щТ???뺤씤???꾩슂?⑸땲?? ?꾨낫 以??섎굹瑜??좏깮?댁＜?몄슂.' })\n"
            count += 1
        elif "以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.' })\n"
            count += 1
        elif "由щ럭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: `由щ럭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎: ${error.message}` })\n"
            count += 1
        elif "由щ럭 ???以??ㅻ쪟媛" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '由щ럭 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' })\n"
            count += 1
        elif "以묎컻?щТ???뺣낫瑜?李얠쓣 ???놁뒿?덈떎" in old_line:
            lines[i] = indent + "setAlertModal({ show: true, message: '以묎컻?щТ???뺣낫瑜?李얠쓣 ???놁뒿?덈떎.\\n\\n怨좉컼?쇳꽣 ?먮뒗 愿由ъ옄?먭쾶 臾몄쓽?댁＜?몄슂.' })\n"
            count += 1

print(f"Replaced {count} alerts")

with codecs.open("components/CameraButton.tsx", "w", "utf-8-sig") as f:
    f.writelines(lines)
print("Step 5 complete")
