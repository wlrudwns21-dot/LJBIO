-- ============================================================================
-- LJ-BIO — 문서관리 보안등급(기밀 1/2/3)
--   · 기밀 1급: 마스터(지경준) + 대표(is_ceo) + 개별 지정 인원만
--   · 기밀 2급: 관리자(admin) 이상 전부
--   · 기밀 3급: (파일관리 접근 가능한) 전체 = 팀장급 이상
-- 실행: Supabase → SQL Editor → 붙여넣기 → Run.
-- ============================================================================

alter table public.files
  add column if not exists grade   int   not null default 3 check (grade in (1, 2, 3)),
  add column if not exists allowed jsonb not null default '[]'::jsonb;

-- 열람 정책을 보안등급에 맞게 재정의 (파일관리 자체는 팀장급 이상만 접근)
drop policy if exists files_select on public.files;
create policy files_select on public.files
  for select using (
    public.is_manager_up() and (
      grade >= 3
      or (grade = 2 and public.is_admin())
      or (grade = 1 and (
        public.is_master()
        or exists (
          select 1 from public.profiles
          where user_id = auth.uid() and is_ceo
        )
        or lower(coalesce(
          (select email from public.profiles where user_id = auth.uid()), ''
        )) in (
          select lower(x) from jsonb_array_elements_text(coalesce(allowed, '[]'::jsonb)) x
        )
      ))
    )
  );
