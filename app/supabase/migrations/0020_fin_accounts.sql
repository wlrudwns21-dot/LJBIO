-- ============================================================================
-- LJ-BIO — update 20: 계정과목 관리(fin_accounts) + 이익분배(분배) 유형
-- 사업부문별 비용/수익 등 계정과목을 직접 등록, 이익 분배 기록 지원. 한 번만.
-- ============================================================================

-- 1) 거래 유형에 '분배'(이익분배) 추가
alter table public.fin_transactions drop constraint if exists fin_transactions_acct_type_check;
alter table public.fin_transactions
  add constraint fin_transactions_acct_type_check
  check (acct_type in ('수익', '비용', '자산', '부채', '자본', '분배'));

-- 2) 계정과목 관리 테이블
create table if not exists public.fin_accounts (
  id         uuid primary key default gen_random_uuid(),
  acct_type  text not null
             check (acct_type in ('수익', '비용', '자산', '부채', '자본', '분배')),
  name       text not null,              -- 계정과목명
  seg_id     text references public.segments (id) on delete set null,  -- 특정 사업부문 전용(없으면 공통)
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.fin_accounts enable row level security;
drop policy if exists fin_acct_select on public.fin_accounts;
create policy fin_acct_select on public.fin_accounts for select using (public.is_approved());
drop policy if exists fin_acct_insert on public.fin_accounts;
create policy fin_acct_insert on public.fin_accounts for insert to authenticated with check (public.is_approved());
drop policy if exists fin_acct_update on public.fin_accounts;
create policy fin_acct_update on public.fin_accounts for update using (public.is_approved());
drop policy if exists fin_acct_delete on public.fin_accounts;
create policy fin_acct_delete on public.fin_accounts for delete using (public.is_approved());
