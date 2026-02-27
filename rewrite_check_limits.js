const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const checkReviewLimits = async')) {
    console.log(`Found checkReviewLimits at line ${i+1}`);
    
    // Find function end
    let endIdx = i;
    let braceCount = 0;
    for (let j = i; j < lines.length; j++) {
      for (const char of lines[j]) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      if (braceCount === 0 && j > i) {
        endIdx = j;
        break;
      }
    }
    
    console.log(`Function ends at line ${endIdx+1}`);
    
    const newFunc = [
      '  const checkReviewLimits = async (): Promise<boolean> => {',
      '    try {',
      '      if (!authUser?.id) {',
      '        setAlertModal({ show: true, message: \'Login required.\' })',
      '        return false',
      '      }',
      '',
      '      // Get policy values',
      '      const { data: policies } = await supabase',
      '        .from(\'common_code_detail\')',
      '        .select(\'code_value, code_name\')',
      '        .eq(\'code_group\', \'REVIEW_POLICY\')',
      '        .in(\'code_value\', [\'DAILY_LIMIT\', \'MONTHLY_LIMIT\', \'USER_LIMIT\'])',
      '',
      '      const dailyLimit = parseInt(policies?.find(p => p.code_value === \'DAILY_LIMIT\')?.code_name || \'1\')',
      '      const monthlyLimit = parseInt(policies?.find(p => p.code_value === \'MONTHLY_LIMIT\')?.code_name || \'5\')',
      '      const totalLimit = parseInt(policies?.find(p => p.code_value === \'USER_LIMIT\')?.code_name || \'10\')',
      '',
      '      const now = new Date()',
      '      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())',
      '      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)',
      '',
      '      // Check daily count',
      '      const { count: dailyCount, error: dailyError } = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'user_id\', authUser.id)',
      '        .gte(\'created_at\', today.toISOString())',
      '',
      '      if (!dailyError && (dailyCount || 0) >= dailyLimit) {',
      '        setAlertModal({ ',
      '          show: true, ',
      '          message: `You can submit up to ${dailyLimit} reviews per day.\\nPlease try again tomorrow.`',
      '        })',
      '        return false',
      '      }',
      '',
      '      // Check monthly count',
      '      const { count: monthlyCount, error: monthlyError } = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'user_id\', authUser.id)',
      '        .gte(\'created_at\', thisMonth.toISOString())',
      '',
      '      if (!monthlyError && (monthlyCount || 0) >= monthlyLimit) {',
      '        setAlertModal({ ',
      '          show: true, ',
      '          message: `You can submit up to ${monthlyLimit} reviews per month.\\nPlease try again next month.`',
      '        })',
      '        return false',
      '      }',
      '',
      '      // Check total count',
      '      const { count: totalCount, error: totalError } = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'user_id\', authUser.id)',
      '',
      '      if (!totalError && (totalCount || 0) >= totalLimit) {',
      '        setAlertModal({ ',
      '          show: true, ',
      '          message: `You have reached the maximum of ${totalLimit} reviews.`',
      '        })',
      '        return false',
      '      }',
      '',
      '      return true',
      '    } catch (error) {',
      '      console.error(\'Review limit check error:\', error)',
      '      return true',
      '    }',
      '  }',
      ''
    ];
    
    lines.splice(i, endIdx - i + 1, ...newFunc);
    console.log('Rewrote checkReviewLimits completely');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
