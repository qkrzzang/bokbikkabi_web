# 由щ럭 ?깅줉 ?쒗븳 ?뺤콉 (怨듯넻肄붾뱶 愿由?

## 媛쒖슂
由щ럭 ?깅줉 ?쒗븳??`common_code_detail` ?뚯씠釉붿쓽 怨듯넻肄붾뱶濡?愿由ы븯??DB?먯꽌 ?좎뿰?섍쾶 議곗젙?????덉뒿?덈떎.

## 湲곕낯 ?뺤콉

| ?쒗븳 ?좏삎 | 湲곕낯媛?| ?ㅻ챸 |
|---------|--------|------|
| **?쇱씪 ?쒗븳** | 1嫄?| ?섎（???묒꽦 媛?ν븳 理쒕? 由щ럭 ??|
| **?붽컙 ?쒗븳** | 3嫄?| ???ъ뿉 ?묒꽦 媛?ν븳 理쒕? 由щ럭 ??|
| **?ъ슜?먮퀎 ?쒗븳** | 10嫄?| 怨꾩젙???묒꽦 媛?ν븳 珥?由щ럭 ??|

## 怨듯넻肄붾뱶 援ъ“

### ?뚯씠釉? `common_code_detail`
- **code_group**: `REVIEW_POLICY`
- **use_yn**: `Y` (?쒖꽦??

| code_value | code_name | extra_value1 | extra_value2 | ?ㅻ챸 |
|------------|-----------|--------------|--------------|------|
| DAILY_LIMIT | Daily Review Limit | 1 | Maximum reviews per day | ?쇱씪 ?쒗븳 |
| MONTHLY_LIMIT | Monthly Review Limit | 3 | Maximum reviews per month | ?붽컙 ?쒗븳 |
| USER_LIMIT | Total User Review Limit | 10 | Maximum total reviews per user | 珥??쒗븳 |

## ?숈옉 諛⑹떇

### 1. 怨듯넻肄붾뱶 議고쉶 (CameraButton.tsx)
```typescript
const { data: policies, error: policyError } = await supabase
  .from('common_code_detail')
  .select('code_value, extra_value1')
  .eq('code_group', 'REVIEW_POLICY')
  .eq('use_yn', 'Y')
  
let dailyLimit = 1      // 湲곕낯媛?let monthlyLimit = 3    // 湲곕낯媛?let userLimit = 10      // 湲곕낯媛?
if (!policyError && policies) {
  policies.forEach((p: any) => {
    if (p.code_value === 'DAILY_LIMIT') dailyLimit = Number(p.extra_value1) || 1
    if (p.code_value === 'MONTHLY_LIMIT') monthlyLimit = Number(p.extra_value1) || 3
    if (p.code_value === 'USER_LIMIT') userLimit = Number(p.extra_value1) || 10
  })
}
```

### 2. 由щ럭 媛쒖닔 泥댄겕
```typescript
// 1. ?쇱씪 ?쒗븳 泥댄겕
const { count: dailyCount } = await supabase
  .from('agent_reviews')
  .select('*', { count: 'exact', head: true })
  .eq('supabase_user_id', authUser.id)
  .gte('created_at', startOfDay)

if ((dailyCount || 0) >= dailyLimit) {
  alert(`?섎（??理쒕? ${dailyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.`)
  return
}

// 2. ?붽컙 ?쒗븳 泥댄겕
const { count: monthlyCount } = await supabase
  .from('agent_reviews')
  .select('*', { count: 'exact', head: true })
  .eq('supabase_user_id', authUser.id)
  .gte('created_at', startOfMonth)

if ((monthlyCount || 0) >= monthlyLimit) {
  alert(`???ъ뿉 理쒕? ${monthlyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.`)
  return
}

// 3. ?ъ슜?먮퀎 珥??쒗븳 泥댄겕
const { count: totalCount } = await supabase
  .from('agent_reviews')
  .select('*', { count: 'exact', head: true })
  .eq('supabase_user_id', authUser.id)

if ((totalCount || 0) >= userLimit) {
  alert(`怨꾩젙??理쒕? ${userLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.`)
  return
}
```

## ?뺤콉 蹂寃?諛⑸쾿

### 諛⑸쾿 1: Supabase Dashboard?먯꽌 吏곸젒 ?섏젙
1. Supabase Dashboard ??Table Editor
2. `common_code_detail` ?뚯씠釉??좏깮
3. `code_group = 'REVIEW_POLICY'` ??李얘린
4. `extra_value1` 媛??섏젙

**?덉떆: ?쇱씪 ?쒗븳??2嫄댁쑝濡?蹂寃?*
```
code_group: REVIEW_POLICY
code_value: DAILY_LIMIT
extra_value1: 2  ??蹂寃?```

### 諛⑸쾿 2: SQL濡??쇨큵 ?낅뜲?댄듃
```sql
-- ?쇱씪 ?쒗븳??2嫄댁쑝濡?蹂寃?UPDATE common_code_detail
SET extra_value1 = '2', updated_at = NOW()
WHERE code_group = 'REVIEW_POLICY' AND code_value = 'DAILY_LIMIT';

-- ?붽컙 ?쒗븳??5嫄댁쑝濡?蹂寃?UPDATE common_code_detail
SET extra_value1 = '5', updated_at = NOW()
WHERE code_group = 'REVIEW_POLICY' AND code_value = 'MONTHLY_LIMIT';

-- ?ъ슜?먮퀎 ?쒗븳??20嫄댁쑝濡?蹂寃?UPDATE common_code_detail
SET extra_value1 = '20', updated_at = NOW()
WHERE code_group = 'REVIEW_POLICY' AND code_value = 'USER_LIMIT';
```

## 留덉씠洹몃젅?댁뀡 ?ㅽ뻾

### 珥덇린 ?ㅼ젙
```bash
# Supabase Dashboard ??SQL Editor?먯꽌 ?ㅽ뻾
# ?뚯씪: supabase/migrations/setup_review_policy_codes.sql
```

?먮뒗 CLI:
```bash
npx supabase db push
```

## ?ъ슜??硫붿떆吏

?쒗븳???꾨떖?덉쓣 ???쒖떆?섎뒗 硫붿떆吏:

| ?쒗븳 ?좏삎 | 硫붿떆吏 |
|----------|--------|
| ?쇱씪 ?쒗븳 | "?섎（??理쒕? {dailyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.<br>?댁씪 ?ㅼ떆 ?쒕룄?댁＜?몄슂." |
| ?붽컙 ?쒗븳 | "???ъ뿉 理쒕? {monthlyLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎.<br>?ㅼ쓬 ?ъ뿉 ?ㅼ떆 ?쒕룄?댁＜?몄슂." |
| 珥??쒗븳 | "怨꾩젙??理쒕? {userLimit}嫄댁쓽 由щ럭留??깅줉?????덉뒿?덈떎." |

## 二쇱쓽?ы빆

1. **?ㅼ떆媛?諛섏쁺**: 怨듯넻肄붾뱶 蹂寃???利됱떆 諛섏쁺?⑸땲??(???ъ떆??遺덊븘??
2. **湲곕낯媛?*: 怨듯넻肄붾뱶 議고쉶 ?ㅽ뙣 ???섎뱶肄붾뵫??湲곕낯媛??ъ슜
   - dailyLimit = 1
   - monthlyLimit = 3
   - userLimit = 10
3. **use_yn**: 諛섎뱶??'Y'濡??ㅼ젙?댁빞 ?뺤콉???곸슜?⑸땲??4. **?곗씠?????*: extra_value1? 臾몄옄?댁씠誘濡?Number()濡?蹂??
## 愿???뚯씪
- `components/CameraButton.tsx`: 由щ럭 ?쒗븳 濡쒖쭅 援ы쁽
- `supabase/migrations/setup_review_policy_codes.sql`: 怨듯넻肄붾뱶 珥덇린??- `supabase/REVIEW_POLICY.md`: 蹂?臾몄꽌