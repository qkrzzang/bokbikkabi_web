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
      '      console.log(\'[Review Limits] Checking review limits for user:\', authUser.id)',
      '',
      '      // Get policy values with error handling',
      '      const policiesQuery = await supabase',
      '        .from(\'common_code_detail\')',
      '        .select(\'code_value, code_name\')',
      '        .eq(\'group_code\', \'REVIEW_POLICY\')',
      '        .in(\'code_value\', [\'DAILY_LIMIT\', \'MONTHLY_LIMIT\', \'USER_LIMIT\'])',
      '',
      '      if (policiesQuery.error) {',
      '        console.error(\'[Review Limits] Policy query error:\', policiesQuery.error)',
      '        // If policy table is not accessible, allow by default',
      '        return true',
      '      }',
      '',
      '      const policies = policiesQuery.data',
      '      const dailyLimit = parseInt(policies?.find((p: any) => p.code_value === \'DAILY_LIMIT\')?.code_name || \'1\')',
      '      const monthlyLimit = parseInt(policies?.find((p: any) => p.code_value === \'MONTHLY_LIMIT\')?.code_name || \'5\')',
      '      const totalLimit = parseInt(policies?.find((p: any) => p.code_value === \'USER_LIMIT\')?.code_name || \'10\')',
      '',
      '      console.log(\'[Review Limits] Limits:\', { dailyLimit, monthlyLimit, totalLimit })',
      '',
      '      const now = new Date()',
      '      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())',
      '      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)',
      '',
      '      // Check daily count',
      '      const dailyQuery = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'user_id\', authUser.id)',
      '        .gte(\'created_at\', today.toISOString())',
      '',
      '      if (dailyQuery.error) {',
      '        console.error(\'[Review Limits] Daily count error:\', dailyQuery.error)',
      '        // If agent_reviews is not accessible, allow by default',
      '        return true',
      '      }',
      '',
      '      const dailyCount = dailyQuery.count || 0',
      '      console.log(\'[Review Limits] Daily count:\', dailyCount, \'/\', dailyLimit)',
      '',
      '      if (dailyCount >= dailyLimit) {',
      '        setAlertModal({ ',
      '          show: true, ',
      '          message: `You can submit up to ${dailyLimit} reviews per day.\\nPlease try again tomorrow.`',
      '        })',
      '        return false',
      '      }',
      '',
      '      // Check monthly count',
      '      const monthlyQuery = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'user_id\', authUser.id)',
      '        .gte(\'created_at\', thisMonth.toISOString())',
      '',
      '      if (monthlyQuery.error) {',
      '        console.error(\'[Review Limits] Monthly count error:\', monthlyQuery.error)',
      '        return true',
      '      }',
      '',
      '      const monthlyCount = monthlyQuery.count || 0',
      '      console.log(\'[Review Limits] Monthly count:\', monthlyCount, \'/\', monthlyLimit)',
      '',
      '      if (monthlyCount >= monthlyLimit) {',
      '        setAlertModal({ ',
      '          show: true, ',
      '          message: `You can submit up to ${monthlyLimit} reviews per month.\\nPlease try again next month.`',
      '        })',
      '        return false',
      '      }',
      '',
      '      // Check total count',
      '      const totalQuery = await supabase',
      '        .from(\'agent_reviews\')',
      '        .select(\'*\', { count: \'exact\', head: true })',
      '        .eq(\'user_id\', authUser.id)',
      '',
      '      if (totalQuery.error) {',
      '        console.error(\'[Review Limits] Total count error:\', totalQuery.error)',
      '        return true',
      '      }',
      '',
      '      const totalCount = totalQuery.count || 0',
      '      console.log(\'[Review Limits] Total count:\', totalCount, \'/\', totalLimit)',
      '',
      '      if (totalCount >= totalLimit) {',
      '        setAlertModal({ ',
      '          show: true, ',
      '          message: `You have reached the maximum of ${totalLimit} reviews.`',
      '        })',
      '        return false',
      '      }',
      '',
      '      console.log(\'[Review Limits] All checks passed\')',
      '      return true',
      '    } catch (error) {',
      '      console.error(\'[Review Limits] Unexpected error:\', error)',
      '      // On error, allow by default to not block users',
      '      return true',
      '    }',
      '  }',
      ''
    ];
    
    lines.splice(i, endIdx - i + 1, ...newFunc);
    console.log('Improved checkReviewLimits with better error handling');
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
