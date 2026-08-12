-- ============================================================================
-- LJ-BIO — 계정별 '마지막 확인 시각' (메뉴 새 항목 N 뱃지)
-- 새 등록이 있으면 메뉴에 N 표시 → 그 계정이 확인하면 그 계정만 사라짐.
-- ※ 이 마이그레이션은 2026-08-12 Supabase에 이미 적용되어 있습니다.
-- ============================================================================

create table if not exists public.section_seen (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  section    text not null,
  seen_at    timestamptz not null default now(),
  primary key (profile_id, section)
);

alter table public.section_seen enable row level security;

drop policy if exists section_seen_own on public.section_seen;
create policy section_seen_own on public.section_seen
  for all
  using (profile_id = (select id from public.profiles where user_id = auth.uid()))
  with check (profile_id = (select id from public.profiles where user_id = auth.uid()));
