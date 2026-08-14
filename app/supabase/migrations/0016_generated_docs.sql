-- ============================================================================
-- LJ-BIO — 문서 생성 저장 관리 (구매발주서·상업송장·견적서 저장/재편집)
-- ※ 이 마이그레이션은 2026-08-12 Supabase에 이미 적용되어 있습니다.
-- ============================================================================

create table if not exists public.generated_docs (
  id         uuid primary key default gen_random_uuid(),
  doc_type   text not null,          -- 'PO' | 'CIJ' | 'QT'
  title      text not null,
  data       jsonb not null default '{}'::jsonb,
  author     text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.generated_docs enable row level security;

drop policy if exists generated_docs_select on public.generated_docs;
drop policy if exists generated_docs_write on public.generated_docs;
create policy generated_docs_select on public.generated_docs
  for select using (public.is_approved());
create policy generated_docs_write on public.generated_docs
  for all using (public.is_approved()) with check (public.is_approved());
