const fs = require('fs');
let lines = fs.readFileSync('components/CameraButton.tsx', 'utf8').split('\n');

// Find handleConfirm and insert checkReviewLimits before it
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleConfirm = () => {')) {
    console.log(`Found handleConfirm at line ${i+1}`);
    
    const checkLimitsFunc = [
      '  const checkReviewLimits = async (): Promise<boolean> => {',
      '    try {',
      '      const supabase = createClientComponentClient()',
      '      const { data: { user: authUser } } = await supabase.auth.getUser()',
      '',
      '      if (!authUser?.id) {',
      '        setAlertModal({ show: true, message: \'Login required.\' })',
      '        return false',
      '      }',
      '',
      '      // Get policy values',
      '      const { data: policies } = await supabase',
      '        .from(\'common_code_detail\')',
      '        .select(\'code_value, code_name\')',
      '        .eq(\'group_code\', \'REVIEW_POLICY\')',
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
    
    // Insert before handleConfirm
    lines.splice(i, 0, ...checkLimitsFunc);
    console.log(`Inserted checkReviewLimits before handleConfirm`);
    break;
  }
}

fs.writeFileSync('components/CameraButton.tsx', lines.join('\n'), 'utf8');
console.log('Done');
