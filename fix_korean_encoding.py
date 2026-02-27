import codecs

with codecs.open('components/CameraButton.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

# Find handleConfirm at line 163 (index 162)
if 'const handleConfirm = () => {' in lines[162]:
    # Replace line 163
    lines[162] = '  const handleConfirm = async () => {\n'
    
    # Insert auth and review check after line 166 (if (!isAgreementChecked) return)
    insert_pos = 166
    
    new_code = [
        '\n',
        '    // 인증 체크\n',
        '    if (!checkAuth()) return\n',
        '    if (!authUser?.id) {\n',
        '      alert(\'로그인이 필요합니다.\')\n',
        '      return\n',
        '    }\n',
        '\n',
        '    // 리뷰 제한 체크\n',
        '    const canProceed = await checkReviewLimits()\n',
        '    if (!canProceed) {\n',
        '      return\n',
        '    }\n',
        '\n'
    ]
    
    for line in reversed(new_code):
        lines.insert(166, line)
    
    print('handleConfirm modified to async')

# Find handleCancelConfirm and add checkReviewLimits after it
for i in range(len(lines)):
    if 'const handleCancelConfirm = () => {' in lines[i]:
        close_pos = i + 3
        
        check_func = '''
  // 리뷰 제한 체크 함수
  const checkReviewLimits = async (): Promise<boolean> => {
    try {
      const { data: policies, error: policyError } = await supabase
        .from('common_code_detail')
        .select('code_value, extra_value1')
        .eq('code_group', 'REVIEW_POLICY')
        .eq('use_yn', 'Y')
      
      let dailyLimit = 1
      let monthlyLimit = 3
      let userLimit = 10

      if (!policyError && policies) {
        policies.forEach((p: any) => {
          if (p.code_value === 'DAILY_LIMIT') dailyLimit = Number(p.extra_value1) || 1
          if (p.code_value === 'MONTHLY_LIMIT') monthlyLimit = Number(p.extra_value1) || 3
          if (p.code_value === 'USER_LIMIT') userLimit = Number(p.extra_value1) || 10
        })
      }

      console.log('[리뷰 제한 체크] 현재 정책:', { dailyLimit, monthlyLimit, userLimit })

      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

      const { count: dailyCount, error: dailyError } = await supabase
        .from('agent_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('supabase_user_id', authUser!.id)
        .gte('created_at', startOfDay)
      
      console.log('[리뷰 제한 체크] 일일 작성 수:', dailyCount, '/ 제한:', dailyLimit)
      
      if (!dailyError && (dailyCount || 0) >= dailyLimit) {
        alert(`하루에 최대 ${dailyLimit}건의 리뷰만 등록할 수 있습니다.\\n내일 다시 시도해주세요.`)
        return false
      }

      const { count: monthlyCount, error: monthlyError } = await supabase
        .from('agent_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('supabase_user_id', authUser!.id)
        .gte('created_at', startOfMonth)

      console.log('[리뷰 제한 체크] 월간 작성 수:', monthlyCount, '/ 제한:', monthlyLimit)

      if (!monthlyError && (monthlyCount || 0) >= monthlyLimit) {
        alert(`한 달에 최대 ${monthlyLimit}건의 리뷰만 등록할 수 있습니다.\\n다음 달에 다시 시도해주세요.`)
        return false
      }

      const { count: totalCount, error: totalError } = await supabase
        .from('agent_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('supabase_user_id', authUser!.id)

      console.log('[리뷰 제한 체크] 전체 작성 수:', totalCount, '/ 제한:', userLimit)

      if (!totalError && (totalCount || 0) >= userLimit) {
        alert(`계정당 최대 ${userLimit}건의 리뷰만 등록할 수 있습니다.`)
        return false
      }

      return true
    } catch (error) {
      console.error('리뷰 제한 체크 오류:', error)
      return true
    }
  }

'''
        lines.insert(close_pos, check_func)
        print('checkReviewLimits function added')
        break

# Write with UTF-8-BOM for Windows compatibility
with codecs.open('components/CameraButton.tsx', 'w', 'utf-8-sig') as f:
    f.writelines(lines)

print('File saved with UTF-8-BOM encoding')
