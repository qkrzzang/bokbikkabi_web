const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleCancelConfirm = () => {')) {
    const funcLines = [
      '',
      '  const checkReviewLimits = async (): Promise<boolean> => {',
      '    try {',
      '      const { data: policies, error: policyError } = await supabase',
      "        .from('common_code_detail')",
      "        .select('code_value, extra_value1')",
      "        .eq('code_group', 'REVIEW_POLICY')",
      "        .eq('use_yn', 'Y')",
      '      ',
      '      let dailyLimit = 1',
      '      let monthlyLimit = 3',
      '      let userLimit = 10',
      '',
      '      if (!policyError && policies) {',
      '        policies.forEach((p: any) => {',
      "          if (p.code_value === 'DAILY_LIMIT') dailyLimit = Number(p.extra_value1) || 1",
      "          if (p.code_value === 'MONTHLY_LIMIT') monthlyLimit = Number(p.extra_value1) || 3",
      "          if (p.code_value === 'USER_LIMIT') userLimit = Number(p.extra_value1) || 10",
      '        })',
      '      }',
      '',
      '      const today = new Date()',
      '      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()',
      '      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()',
      '',
      '      const { count: dailyCount, error: dailyError } = await supabase',
      "        .from('agent_reviews')",
      "        .select('*', { count: 'exact', head: true })",
      "        .eq('supabase_user_id', authUser!.id)",
      "        .gte('created_at', startOfDay)",
      '      ',
      '      if (!dailyError && (dailyCount || 0) >= dailyLimit) {',
      '        setAlertModal({ show: true, message: `You can submit up to ${dailyLimit} reviews per day.\\nPlease try again tomorrow.` })',
      '        return false',
      '      }',
      '',
      '      const { count: monthlyCount, error: monthlyError } = await supabase',
      "        .from('agent_reviews')",
      "        .select('*', { count: 'exact', head: true })",
      "        .eq('supabase_user_id', authUser!.id)",
      "        .gte('created_at', startOfMonth)",
      '',
      '      if (!monthlyError && (monthlyCount || 0) >= monthlyLimit) {',
      '        setAlertModal({ show: true, message: `You can submit up to ${monthlyLimit} reviews per month.\\nPlease try again next month.` })',
      '        return false',
      '      }',
      '',
      '      const { count: totalCount, error: totalError } = await supabase',
      "        .from('agent_reviews')",
      "        .select('*', { count: 'exact', head: true })",
      "        .eq('supabase_user_id', authUser!.id)",
      '',
      '      if (!totalError && (totalCount || 0) >= userLimit) {',
      '        setAlertModal({ show: true, message: `You can submit up to ${userLimit} reviews per account.` })',
      '        return false',
      '      }',
      '',
      '      return true',
      '    } catch (error) {',
      "      console.error('Review limit check error:', error)",
      '      return true',
      '    }',
      '  }',
      ''
    ];
    
    lines.splice(i + 4, 0, ...funcLines);
    console.log(`Step 2: Added checkReviewLimits at line ${i+5}`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
