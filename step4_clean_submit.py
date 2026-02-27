import codecs

with codecs.open("components/CameraButton.tsx", "r", "utf-8-sig") as f:
    lines = f.readlines()

# Find handleReviewSubmit
for i in range(len(lines)):
    if "const handleReviewSubmit = async () => {" in lines[i]:
        print(f"Found handleReviewSubmit at line {i+1}")
        
        # Remove auth check (lines after: if (!checkAuth()))
        for j in range(i+1, min(i+15, len(lines))):
            if "// ?몄쬆 泥댄겕" in lines[j] or "// ?占쏙옙? 泥댄겕" in lines[j]:
                del lines[j:j+7]
                print(f"Removed auth check at line {j+1}")
                break
        
        # Remove review limit check
        for j in range(i+1, min(i+100, len(lines))):
            if "REVIEW_POLICY" in lines[j]:
                for k in range(j, min(j+80, len(lines))):
                    if "const reviewLength" in lines[k]:
                        del lines[j-1:k]
                        print(f"Removed review limit check ({k-j+1} lines)")
                        break
                break
        break

# Replace alert() calls
alert_replacements = [
    ("alert('?곸꽭 由щ럭??20???댁긽 ?묒꽦?댁＜?몄슂.')", "setAlertModal({ show: true, message: '?곸꽭 由щ럭??20???댁긽 ?묒꽦?댁＜?몄슂.' })"),
    ("alert('嫄곕옒 ?쒓렇瑜??좏깮?댁＜?몄슂.')", "setAlertModal({ show: true, message: '嫄곕옒 ?쒓렇瑜??좏깮?댁＜?몄슂.' })"),
    ("alert('移?갔 ?쒓렇 ?먮뒗 ?꾩돩? ?쒓렇 以?理쒖냼 1媛쒕? ?좏깮?댁＜?몄슂.')", "setAlertModal({ show: true, message: '移?갔 ?쒓렇 ?먮뒗 ?꾩돩? ?쒓렇 以?理쒖냼 1媛쒕? ?좏깮?댁＜?몄슂.' })"),
    ("alert(`紐⑤뱺 ?곸꽭 ?됯? ??ぉ???좏깮?댁＜?몄슂.\\\\n誘몄꽑????ぉ: ${missingNames}`)", "setAlertModal({ show: true, message: `紐⑤뱺 ?곸꽭 ?됯? ??ぉ???좏깮?댁＜?몄슂.\\\\n誘몄꽑????ぉ: ${missingNames}` })"),
    ("alert('以묎컻?щТ???뺤씤???꾩슂?⑸땲?? ?꾨낫 以??섎굹瑜??좏깮?댁＜?몄슂.')", "setAlertModal({ show: true, message: '以묎컻?щТ???뺤씤???꾩슂?⑸땲?? ?꾨낫 以??섎굹瑜??좏깮?댁＜?몄슂.' })"),
    ("alert('以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.')", "setAlertModal({ show: true, message: '以묎컻?щТ???뺣낫媛 ?놁뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.' })"),
    ("alert(`由щ럭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎: ${error.message}`)", "setAlertModal({ show: true, message: `由щ럭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎: ${error.message}` })"),
    ("alert('由щ럭 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.')", "setAlertModal({ show: true, message: '由щ럭 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' })"),
]

for i in range(len(lines)):
    for old, new in alert_replacements:
        if old in lines[i]:
            lines[i] = lines[i].replace(old, new)
            print(f"Replaced alert at line {i+1}")

with codecs.open("components/CameraButton.tsx", "w", "utf-8-sig") as f:
    f.writelines(lines)
print("Step 4 complete")
