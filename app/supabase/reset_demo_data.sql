-- ============================================================================
-- LJ-BIO — 예시(더미) 데이터 초기화
-- 사용자(profiles)는 유지하고, 나머지 예시 콘텐츠를 모두 비웁니다.
-- 실행: Supabase → SQL Editor → 붙여넣기 → Run.  (되돌릴 수 없으니 주의)
-- ============================================================================

-- 업무 콘텐츠 (자식 테이블은 ON DELETE CASCADE로 함께 삭제됩니다)
delete from public.tasks;            -- → task_stages, task_comments 함께 삭제
delete from public.conversations;    -- → messages 함께 삭제
delete from public.notices;
delete from public.mails;
delete from public.approvals;
delete from public.partners;
delete from public.files;
delete from public.leaves;
delete from public.calendar_events;
delete from public.inquiries;

-- 사업 부문: 카테고리(의약품 도매 등)는 유지하고 예시 매출/주문 숫자만 0으로 초기화
update public.segments set orders = 0, revenue = 0;

-- ----------------------------------------------------------------------------
-- (선택) 사업 부문·계약서 유형까지 "완전히 백지"로 만들고 직접 새로 넣고 싶다면
-- 아래 두 줄 앞의 '-- ' 를 지우고 함께 실행하세요.
-- delete from public.segments;
-- delete from public.contract_types;
-- ----------------------------------------------------------------------------

-- 유지되는 것: profiles(직원 계정), settings(회사 직인), gmail_accounts(메일 연결),
--            segments(카테고리), contract_types(계약서 유형)
