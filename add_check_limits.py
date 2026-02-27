import codecs

with codecs.open('components/CameraButton.tsx', 'r', 'utf-8-sig') as f:
    lines = f.readlines()

# Find handleCancelConfirm
for i in range(len(lines)):
    if 'const handleCancelConfirm = () => {' in lines[i]:
        insert_pos = i + 4
        
        func_lines = [
            '  const checkReviewLimits = async (): Promise<boolean> => {\n',
            '    try {\n',
            '      const { data: policies, error: policyError } = await supabase\n',
            "        .from('common_code_detail')\n",
            "        .select('code_value, extra_value1')\n",
            "        .eq('code_group', 'REVIEW_POLICY')\n",
            "        .eq('use_yn', 'Y')\n",
            '      \n',
            '      let dailyLimit = 1\n',
            '      let monthlyLimit = 3\n',
            '      let userLimit = 10\n',
            '\n',
            '      if (!policyError && policies) {\n',
            '        policies.forEach((p: any) => {\n',
            "          if (p.code_value === 'DAILY_LIMIT') dailyLimit = Number(p.extra_value1) || 1\n",
            "          if (p.code_value === 'MONTHLY_LIMIT') monthlyLimit = Number(p.extra_value1) || 3\n",
            "          if (p.code_value === 'USER_LIMIT') userLimit = Number(p.extra_value1) || 10\n",
            '        })\n',
            '      }\n',
            '\n',
            '      const today = new Date()\n',
            '      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()\n',
            '      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()\n',
            '\n',
            '      const { count: dailyCount, error: dailyError } = await supabase\n',
            "        .from('agent_reviews')\n",
            "        .select('*', { count: 'exact', head: true })\n",
            "        .eq('supabase_user_id', authUser!.id)\n",
            "        .gte('created_at', startOfDay)\n",
            '      \n',
            '      if (!dailyError && (dailyCount || 0) >= dailyLimit) {\n',
            '        setAlertModal({ show: true, message: `하루에 최대 ${dailyLimit}건의 리뷰만 등록할 수 있습니다.\\n내일 다시 시도해주세요.` })\n',
            '        return false\n',
            '      }\n',
            '\n',
            '      const { count: monthlyCount, error: monthlyError } = await supabase\n',
            "        .from('agent_reviews')\n",
            "        .select('*', { count: 'exact', head: true })\n",
            "        .eq('supabase_user_id', authUser!.id)\n",
            "        .gte('created_at', startOfMonth)\n",
            '\n',
            '      if (!monthlyError && (monthlyCount || 0) >= monthlyLimit) {\n',
            '        setAlertModal({ show: true, message: `한 달에 최대 ${monthlyLimit}건의 리뷰만 등록할 수 있습니다.\\n다음 달에 다시 시도해주세요.` })\n',
            '        return false\n',
            '      }\n',
            '\n',
            '      const { count: totalCount, error: totalError } = await supabase\n',
            "        .from('agent_reviews')\n",
            "        .select('*', { count: 'exact', head: true })\n",
            "        .eq('supabase_user_id', authUser!.id)\n",
            '\n',
            '      if (!totalError && (totalCount || 0) >= userLimit) {\n',
            '        setAlertModal({ show: true, message: `계정당 최대 ${userLimit}건의 리뷰만 등록할 수 있습니다.` })\n',
            '        return false\n',
            '      }\n',
            '\n',
            '      return true\n',
            '    } catch (error) {\n',
            "      console.error('리뷰 제한 체크 오류:', error)\n",
            '      return true\n',
            '    }\n',
            '  }\n',
            '\n'
        ]
        
        for line in reversed(func_lines):
            lines.insert(insert_pos, line)
        
        print(f'Added checkReviewLimits at line {insert_pos+1}')
        break

with codecs.open('components/CameraButton.tsx', 'w', 'utf-8-sig') as f:
    f.writelines(lines)

print('Step 2 complete')
