const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find handleConfirm function
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleConfirm = ()')) {
    console.log(`Found handleConfirm at line ${i+1}`);
    
    // Replace with async version and add review limit check
    const newHandleConfirm = [
      '  const handleConfirm = async () => {',
      '    if (!isAgreementChecked) {',
      '      return',
      '    }',
      '',
      '    // Check authentication',
      '    if (!checkAuth()) return',
      '    if (!authUser?.id) {',
      '      alert(\'Please log in to write a review.\')',
      '      return',
      '    }',
      '',
      '    try {',
      '      // Check review limits from REVIEW_POLICY',
      '      const { data: policies, error: policyError } = await supabase',
      '        .from(\'common_code_detail\')',
      '        .select(\'code_value, extra_value1\')',
      '        .eq(\'code_group\', \'REVIEW_POLICY\')',
      '        .eq(\'use_yn\', \'Y\')',
      '      ',
      '      let dailyLimit = 1',
      '      let monthlyLimit = 3',
      '      let userLimit = 10',
      '',
      '      if (!policyError && policies) {',
      '        policies.forEach((p: any) => {',
      '          if (p.code_value === \'DAILY_LIMIT\') dailyLimit = Number(p.extra_value1) || 1',
      '          if (p.code_value === \'MONTHLY_LIMIT\') monthlyLimit = Number(p.extra_value1) || 3',
      '          if (p.code_value === \'USER_LIMIT\') userLimit = Number(p.extra_value1) || 10',
      '        })',
      '      }',
      '',
      '      const today = new Date()',
      '      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()',
      '      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()',
      '',
      '      // 1. Daily limit check',
      '      const { count: dailyCount, error: dailyError } = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'supabase_user_id\', authUser.id)',
      '        .gte(\'created_at\', startOfDay)',
      '      ',
      '      if (!dailyError && (dailyCount || 0) >= dailyLimit) {',
      '        alert(`You can submit up to ${dailyLimit} review(s) per day.\\nPlease try again tomorrow.`)',
      '        return',
      '      }',
      '',
      '      // 2. Monthly limit check',
      '      const { count: monthlyCount, error: monthlyError } = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'supabase_user_id\', authUser.id)',
      '        .gte(\'created_at\', startOfMonth)',
      '',
      '      if (!monthlyError && (monthlyCount || 0) >= monthlyLimit) {',
      '        alert(`You can submit up to ${monthlyLimit} review(s) per month.\\nPlease try again next month.`)',
      '        return',
      '      }',
      '',
      '      // 3. Total user limit check',
      '      const { count: totalCount, error: totalError } = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'supabase_user_id\', authUser.id)',
      '',
      '      if (!totalError && (totalCount || 0) >= userLimit) {',
      '        alert(`You can submit up to ${userLimit} review(s) in total.`)',
      '        return',
      '      }',
      '',
      '      // All checks passed - open review modal',
      '      setIsConfirmModalOpen(false)',
      '      setIsAgreementChecked(false)',
      '      setIsOpen(true)',
      '      setMode(\'select\')',
      '      setCapturedImage(null)',
      '      console.log(\'Review process started - all limits checked\')',
      '    } catch (error) {',
      '      console.error(\'Error checking review limits:\', error)',
      '      alert(\'Failed to check review limits. Please try again.\')',
      '    }',
      '  }'
    ];
    
    // Find the end of handleConfirm (next function or closing brace)
    let endIdx = i + 1;
    let braceCount = 0;
    let started = false;
    
    for (let j = i; j < i + 20; j++) {
      if (lines[j].includes('{')) {
        started = true;
        braceCount++;
      }
      if (lines[j].includes('}')) {
        braceCount--;
        if (started && braceCount === 0) {
          endIdx = j;
          break;
        }
      }
    }
    
    console.log(`Replacing lines ${i+1} to ${endIdx+1}`);
    lines.splice(i, endIdx - i + 1, ...newHandleConfirm);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Added review limit check to handleConfirm - NO ROLLBACK of existing logic!');
