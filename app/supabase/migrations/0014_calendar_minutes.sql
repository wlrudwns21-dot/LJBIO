-- ============================================================================
-- LJ-BIO — 일정에 회의 결과(회의록) 기록
-- 실행: Supabase → SQL Editor → 붙여넣기 → Run.
-- ============================================================================

alter table public.calendar_events
  add column if not exists minutes text not null default '',
  add column if not exists minutes_author text default '',
  add column if not exists minutes_at date;
