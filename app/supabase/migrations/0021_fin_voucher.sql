-- ============================================================================
-- LJ-BIO — update 21: 지출결의(voucher) 필드 추가 (재무 거래 확장)
-- 지출결의 등록/승인/지급 워크플로우 지원. 한 번만 실행.
-- ============================================================================

alter table public.fin_transactions add column if not exists is_voucher boolean not null default false;
alter table public.fin_transactions add column if not exists status      text not null default '';   -- 대기·승인·반려·지급완료
alter table public.fin_transactions add column if not exists requester   text default '';            -- 신청자
