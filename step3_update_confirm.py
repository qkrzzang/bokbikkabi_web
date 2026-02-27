import codecs

with codecs.open("components/CameraButton.tsx", "r", "utf-8-sig") as f:
    lines = f.readlines()

for i in range(len(lines)):
    if "const handleConfirm = () => {" in lines[i]:
        print(f"Found handleConfirm at line {i+1}")
        new_func = [
            "  const handleConfirm = async () => {\n",
            "    if (!isAgreementChecked) {\n",
            "      return\n",
            "    }\n",
            "\n",
            "    // ?몄쬆 泥댄겕\n",
            "    if (!checkAuth()) return\n",
            "    if (!authUser?.id) {\n",
            "      setAlertModal({ show: true, message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??' })\n",
            "      return\n",
            "    }\n",
            "\n",
            "    // 由щ럭 ?쒗븳 泥댄겕\n",
            "    const canProceed = await checkReviewLimits()\n",
            "    if (!canProceed) {\n",
            "      return\n",
            "    }\n",
            "\n",
            "    setIsConfirmModalOpen(false)\n",
            "    setIsAgreementChecked(false)\n",
            "    setIsOpen(true)\n",
            "    setMode('select')\n",
            "    setCapturedImage(null)\n",
            "    console.log('由щ럭 ?묒꽦 ?꾨줈?몄뒪 ?쒖옉')\n",
            "  }\n"
        ]
        del lines[i:i+12]
        for line in reversed(new_func):
            lines.insert(i, line)
        print("Replaced handleConfirm")
        break

with codecs.open("components/CameraButton.tsx", "w", "utf-8-sig") as f:
    f.writelines(lines)
print("Step 3 complete")
