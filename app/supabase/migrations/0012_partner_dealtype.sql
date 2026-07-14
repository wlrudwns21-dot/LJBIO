-- ============================================================================
-- LJ-BIO — 거래처 '거래 유형'에 매입·매출(양방향) 허용
-- 등록 화면에는 '매입·매출' 옵션이 있는데 DB 제약이 '매출/매입'만 허용해서
-- 그 값을 고르면 저장이 되지 않던 문제를 고칩니다.
-- 실행: Supabase → SQL Editor → 붙여넣기 → Run.
-- ============================================================================

alter table public.partners drop constraint if exists partners_deal_type_check;
alter table public.partners
  add constraint partners_deal_type_check
  check (deal_type in ('매출', '매입', '매입·매출'));
