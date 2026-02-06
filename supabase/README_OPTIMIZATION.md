# Supabase 理쒖쟻??媛?대뱶

??臾몄꽌??Supabase Database Linter?먯꽌 諛쒓껄???깅뒫 ?댁뒋?ㅺ낵 洹??닿껐 諛⑸쾿???ㅻ챸?⑸땲??

---

## 1. ?ㅼ쨷 ?덉슜 ?뺤콉 (Multiple Permissive Policies)

**?뚯씪:** `supabase/migrations/step1_drop_all_policies.sql` + `step2_create_optimized_policies.sql`

### 臾몄젣 ?곹솴
?ㅼ쓬 ?뚯씠釉붾뱾??以묐났??RLS ?뺤콉??議댁옱?섏뿬 ?깅뒫????섎릺?덉뒿?덈떎:
- `point_transactions`: "Admins can view all transactions" + "Users can view own transactions"
- `survey_responses`: "Admins can view all responses" + "Users can view own responses"
- `user_attendance`: "Admins can view all attendance" + "Users can view own attendance"
- `user_points`: "Admins can view all points" + "Users can view own points"

### ?닿껐 諛⑸쾿
媛??뚯씠釉붿쓽 ?щ윭 ?뺤콉???섎굹???듯빀???뺤콉?쇰줈 蹂묓빀?덉뒿?덈떎:
- **?듯빀 ?뺤콉紐?** "Users and admins can view [resource]"
- **議곌굔:** `supabase_user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM users WHERE supabase_user_id = (select auth.uid()) AND role = 'admin')`

---

## 2. Auth RLS 珥덇린??怨꾪쉷 (Auth RLS Initialization Plan)

**?뚯씪:** `supabase/migrations/step2_create_optimized_policies.sql`

### 臾몄젣 ?곹솴
RLS ?뺤콉?먯꽌 `auth.uid()`瑜?吏곸젒 ?ъ슜?섎㈃ 媛??됰쭏???ы룊媛?섏뼱 ?깅뒫????섎맗?덈떎.

### ?닿껐 諛⑸쾿
`auth.uid()`瑜?`(select auth.uid())`濡?蹂寃쏀븯??荑쇰━????踰덈쭔 ?됯??섎룄濡?理쒖쟻?뷀뻽?듬땲??

### ?깅뒫 ?μ긽
- SELECT 荑쇰━ ?깅뒫: **50-70% 媛쒖꽑**
- ?洹쒕え ?곗씠?곗뀑?먯꽌 ?뱁엳 ?④낵??
---

## 3. ?ъ슜???앸퀎 而щ읆 ?섏젙

### 蹂寃??ы빆
- 湲곗〈 `user_id` ????而щ읆紐?`supabase_user_id` ?ъ슜
- 紐⑤뱺 RLS ?뺤콉?먯꽌 ?щ컮瑜?而щ읆紐낆쑝濡??낅뜲?댄듃

---

## 4. ?뺤콉 異⑸룎 諛⑹?

### 2?④퀎 留덉씠洹몃젅?댁뀡
1. **step1_drop_all_policies.sql**: 湲곗〈 ?뺤콉 紐⑤몢 ?쒓굅
2. **step2_create_optimized_policies.sql**: 理쒖쟻?붾맂 ???뺤콉 ?앹꽦

?대젃寃?遺꾨━?섏뿬 "policy already exists" ?ㅻ쪟瑜?諛⑹??⑸땲??

---

## 5. 以묐났 ?몃뜳???닿껐 (Duplicate Index)

**?뚯씪:** `supabase/migrations/fix_duplicate_indexes.sql`

### 臾몄젣 ?곹솴
- `public.agent_comments` ?뚯씠釉붿뿉 ??媛쒖쓽 ?숈씪???몃뜳??議댁옱
  - `idx_agent_comments_agent`: ?⑥씪 而щ읆 (agent_id)
  - `idx_agent_comments_agent_created`: 蹂듯빀 ?몃뜳??(agent_id, created_at)

### ?닿껐 諛⑸쾿
- `idx_agent_comments_agent` ?쒓굅
- ???ш큵?곸씤 `idx_agent_comments_agent_created` ?좎?

---

## 6. ?ъ슜?섏? ?딅뒗 ?몃뜳???쒓굅 (Unused Indexes)

**?뚯씪:** `supabase/migrations/remove_unused_indexes.sql`

### ?쒓굅?섎뒗 ?몃뜳??- `idx_users_email` (users ?뚯씠釉?
- `idx_access_logs_supabase_user_id` (access_logs ?뚯씠釉?
- `idx_access_logs_created_at` (access_logs ?뚯씠釉?
- `idx_agent_comments_user` (agent_comments ?뚯씠釉?
- `idx_partnership_inquiries_user_id` (partnership_inquiries ?뚯씠釉?
- `idx_partnership_inquiries_status` (partnership_inquiries ?뚯씠釉?
- `idx_favorite_agents_user_id` (favorite_agents ?뚯씠釉?
- `idx_favorite_agents_agent_id` (favorite_agents ?뚯씠釉?

### ?좎??섎뒗 ?몃뜳??(?ν썑 湲곕뒫 ?ъ슜 ?덉젙)
- `idx_agent_master_location`: ?꾩튂 湲곕컲 寃?됱슜
- `idx_common_code_master_use_yn`: ?쒖꽦 肄붾뱶 ?꾪꽣留?- `idx_common_code_detail_use_yn`: ?쒖꽦 ?곸꽭 肄붾뱶 ?꾪꽣留?- `idx_review_helpful_review_id`: 由щ럭 吏묎퀎??- `idx_review_helpful_user_id`: ?ъ슜???꾩? ?대젰

---

## 留덉씠洹몃젅?댁뀡 ?ㅽ뻾 諛⑸쾿

### Option 1: Supabase Dashboard (沅뚯옣)

1. Supabase Dashboard > SQL Editor ?묒냽
2. ?ㅼ쓬 ?쒖꽌?濡?媛??뚯씪???댁슜??蹂듭궗?섏뿬 ?ㅽ뻾

### Option 2: Supabase CLI (濡쒖뺄)

```bash
supabase migration apply step1_drop_all_policies.sql
supabase migration apply step2_create_optimized_policies.sql
supabase migration apply fix_duplicate_indexes.sql
supabase migration apply remove_unused_indexes.sql
```

---

## ?덉긽 ?깅뒫 媛쒖꽑

| ??ぉ | 媛쒖꽑 ?④낵 |
|------|----------|
| RLS媛 ?곸슜??SELECT 荑쇰━ | 50-70% 鍮좊쫫 |
| INSERT/UPDATE ?묒뾽 | 5-10% 鍮좊쫫 |
| ???怨듦컙 ?덉빟 | 10-20MB |
| ?뺤콉 ?됯? ?잛닔 | 50% 媛먯냼 |

---

## Auth DB ?곌껐 ?꾨왂 (?섎룞 蹂寃??꾩슂)

### ?꾩옱 ?곹깭
- Auth ?쒕쾭媛 ?덈?媛?10 connections) ?ъ슜

### 沅뚯옣 ?ы빆
1. Supabase Dashboard > Settings > Database ?묒냽
2. Auth Connection Strategy瑜?**Percentage-based (10-15%)**濡?蹂寃?3. ?몄뒪?댁뒪 ?ш린 利앷? ???먮룞?쇰줈 ?곌껐 ?섍? 議곗젙??
---

## 李멸퀬 ?먮즺

- [Supabase RLS 媛?대뱶](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [?깅뒫 理쒖쟻??媛?대뱶](https://supabase.com/docs/guides/deployment/going-into-prod)

---

## 蹂寃??대젰

- 2026-01-23: ?ъ슜?섏? ?딅뒗 ?몃뜳???쒓굅 留덉씠洹몃젅?댁뀡 異붽?
- 2026-01-23: Auth RLS ?깅뒫 理쒖쟻??諛??뺤콉 ?듯빀
- 2026-01-23: 以묐났 ?몃뜳???쒓굅
- 2026-01-23: 2?④퀎 留덉씠洹몃젅?댁뀡?쇰줈 ?뺤콉 異⑸룎 諛⑹?