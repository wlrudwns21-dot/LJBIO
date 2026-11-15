-- ============================================================================
-- LJ-BIO — update 19: 재무 거래/장부 (ERP-lite)
-- 사업부문별 거래 등록(매출·비용·자산·부채·자본), 첨부파일, 재무제표 집계용.
-- 승인된 임직원만 접근(화면에서 팀장급 이상으로 추가 제한). 한 번만 실행.
-- ============================================================================

create table if not exists public.fin_transactions (
  id              uuid primary key default gen_random_uuid(),
  tx_date         date not null default current_date,
  seg_id          text references public.segments (id) on delete set null,
  acct_type       text not null default '수익'
                  check (acct_type in ('수익', '비용', '자산', '부채', '자본')),
  account         text not null default '',   -- 계정과목(상품매출, 급여, 임차료 …)
  partner         text default '',            -- 거래처
  amount          bigint not null default 0,  -- 금액(원)
  memo            text default '',
  attachment      text,                        -- 스토리지 경로(첨부)
  attachment_name text default '',
  created_by      text default '',
  created_at      timestamptz not null default now()
);

alter table public.fin_transactions enable row level security;

drop policy if exists fin_tx_select on public.fin_transactions;
create policy fin_tx_select on public.fin_transactions for select using (public.is_approved());
drop policy if exists fin_tx_insert on public.fin_transactions;
create policy fin_tx_insert on public.fin_transactions for insert to authenticated with check (public.is_approved());
drop policy if exists fin_tx_update on public.fin_transactions;
create policy fin_tx_update on public.fin_transactions for update using (public.is_approved());
drop policy if exists fin_tx_delete on public.fin_transactions;
create policy fin_tx_delete on public.fin_transactions for delete using (public.is_approved());

create index if not exists fin_tx_seg_idx on public.fin_transactions (seg_id);
create index if not exists fin_tx_date_idx on public.fin_transactions (tx_date);
