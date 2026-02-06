-- 由щ럭 ?묒꽦 ?쒗븳 ?뺤콉 ?낅뜲?댄듃
-- ?섎（ 1嫄? ?쒕떖 3嫄? 理쒕? 10嫄댁쑝濡??쒗븳

-- REVIEW_POLICY 肄붾뱶 洹몃９???놁쑝硫??앹꽦
INSERT INTO common_code_detail (code_group, code_value, code_name, extra_value1, sort_order, use_yn, description)
VALUES 
  ('REVIEW_POLICY', 'DAILY_LIMIT', '?쇱씪 由щ럭 ?묒꽦 ?쒗븳', '1', 1, 'Y', '?섎（???묒꽦 媛?ν븳 理쒕? 由щ럭 媛쒖닔')
ON CONFLICT (code_group, code_value) 
DO UPDATE SET 
  extra_value1 = '1',
  code_name = '?쇱씪 由щ럭 ?묒꽦 ?쒗븳',
  description = '?섎（???묒꽦 媛?ν븳 理쒕? 由щ럭 媛쒖닔',
  updated_at = NOW();

INSERT INTO common_code_detail (code_group, code_value, code_name, extra_value1, sort_order, use_yn, description)
VALUES 
  ('REVIEW_POLICY', 'MONTHLY_LIMIT', '?붽컙 由щ럭 ?묒꽦 ?쒗븳', '3', 2, 'Y', '???ъ뿉 ?묒꽦 媛?ν븳 理쒕? 由щ럭 媛쒖닔')
ON CONFLICT (code_group, code_value) 
DO UPDATE SET 
  extra_value1 = '3',
  code_name = '?붽컙 由щ럭 ?묒꽦 ?쒗븳',
  description = '???ъ뿉 ?묒꽦 媛?ν븳 理쒕? 由щ럭 媛쒖닔',
  updated_at = NOW();

INSERT INTO common_code_detail (code_group, code_value, code_name, extra_value1, sort_order, use_yn, description)
VALUES 
  ('REVIEW_POLICY', 'USER_LIMIT', '珥?由щ럭 ?묒꽦 ?쒗븳', '10', 3, 'Y', '?ъ슜?먮떦 ?묒꽦 媛?ν븳 理쒕? 由щ럭 媛쒖닔')
ON CONFLICT (code_group, code_value) 
DO UPDATE SET 
  extra_value1 = '10',
  code_name = '珥?由щ럭 ?묒꽦 ?쒗븳',
  description = '?ъ슜?먮떦 ?묒꽦 媛?ν븳 理쒕? 由щ럭 媛쒖닔',
  updated_at = NOW();