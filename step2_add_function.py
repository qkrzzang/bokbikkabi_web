import codecs

with codecs.open("components/CameraButton.tsx", "r", "utf-8-sig") as f:
    lines = f.readlines()

for i in range(len(lines)):
    if "const handleCancelConfirm = () => {" in lines[i]:
        insert_pos = i + 4
        func_lines = [
            "  const checkReviewLimits = async (): Promise<boolean> => {\n",
            "    try {\n",
            "      const { data: policies, error: policyError } = await supabase\n",
            "        .from('common_code_detail')\n",
            "        .select('code_value, extra_value1')\n",
            "        .eq('code_group', 'REVIEW_POLICY')\n",
            "        .eq('use_yn', 'Y')\n",
            "      \n",
            "      let dailyLimit = 1\n",
            "      let monthlyLimit = 3\n",
            "      let userLimit = 10\n",
            "\n",
            "      if (!policyError && policies) {\n",
            "        policies.forEach((p: any) => {\n",
            "          if (p.code_value === 'DAILY_LIMIT') dailyLimit = Number(p.extra_value1) || 1\n",
            "          if (p.code_value === 'MONTHLY_LIMIT') monthlyLimit = Number(p.extra_value1) || 3\n",
            "          if (p.code_value === 'USER_LIMIT') userLimit = Number(p.extra_value1) || 10\n",
            "        })\n",
            "      }\n",
            "\n",
            "      const today = new Date()\n",
            "      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()\n",
            "      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()\n",
            "\n",
            "      const { count: dailyCount, error: dailyError } = await supabase\n",
            "        .from('agent_reviews')\n",
            "        .select('*', { count: 'exact', head: true })\n",
            "        .eq('supabase_user_id', authUser!.id)\n",
            "        .gte('created_at', startOfDay)\n",
            "      \n",
            "      if (!dailyError && (dailyCount || 0) >= dailyLimit) {\n",
            "        setAlertModal({ show: true, message: `?섎（??理쒕? \${dailyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.\\\\n?댁씪 ?ㅼ떆 ?쒕룄?댁＜?몄슂.` })\n",
            "        return false\n",
            "      }\n",
            "\n",
            "      const { count: monthlyCount, error: monthlyError } = await supabase\n",
            "        .from('agent_reviews')\n",
            "        .select('*', { count: 'exact', head: true })\n",
            "        .eq('supabase_user_id', authUser!.id)\n",
            "        .gte('created_at', startOfMonth)\n",
            "\n",
            "      if (!monthlyError && (monthlyCount || 0) >= monthlyLimit) {\n",
            "        setAlertModal({ show: true, message: `???ъ뿉 理쒕? \${monthlyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.\\\\n?ㅼ쓬 ?ъ뿉 ?ㅼ떆 ?쒕룄?댁＜?몄슂.` })\n",
            "        return false\n",
            "      }\n",
            "\n",
            "      const { count: totalCount, error: totalError } = await supabase\n",
            "        .from('agent_reviews')\n",
            "        .select('*', { count: 'exact', head: true })\n",
            "        .eq('supabase_user_id', authUser!.id)\n",
            "\n",
            "      if (!totalError && (totalCount || 0) >= userLimit) {\n",
            "        setAlertModal({ show: true, message: `怨꾩젙??理쒕? \${userLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.` })\n",
            "        return false\n",
            "      }\n",
            "\n",
            "      return true\n",
            "    } catch (error) {\n",
            "      console.error('由щ럭 ?쒗븳 泥댄겕 ?ㅻ쪟:', error)\n",
            "      return true\n",
            "    }\n",
            "  }\n",
            "\n"
        ]
        for line in reversed(func_lines):
            lines.insert(insert_pos, line)
        print(f"Added at line {insert_pos}")
        break

with codecs.open("components/CameraButton.tsx", "w", "utf-8-sig") as f:
    f.writelines(lines)
print("Done")
