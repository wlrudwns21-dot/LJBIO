-- ============================================================================
-- LJ-BIO portal — update 6: 고객 문의 (public inquiry form → portal)
-- Anyone (a logged-out customer on the public site) can submit; only approved
-- employees can view/manage. Run once on the existing database.
-- ============================================================================

create table if not exists public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company    text default '',
  email      text default '',
  phone      text default '',
  type       text default '',
  message    text not null,
  status     text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

-- 홈페이지 방문자(비로그인 포함) 누구나 문의 등록 가능
drop policy if exists inquiries_insert on public.inquiries;
create policy inquiries_insert on public.inquiries
  for insert to anon, authenticated with check (true);

-- 승인된 임직원만 열람 / 상태변경 / 삭제
drop policy if exists inquiries_select on public.inquiries;
create policy inquiries_select on public.inquiries
  for select using (public.is_approved());
drop policy if exists inquiries_update on public.inquiries;
create policy inquiries_update on public.inquiries
  for update using (public.is_approved());
drop policy if exists inquiries_delete on public.inquiries;
create policy inquiries_delete on public.inquiries
  for delete using (public.is_approved());
