-- ============================================================================
-- LJ-BIO — 예시로 심어둔 '미가입' 직원 계정 삭제
-- 실제로 회원가입해서 로그인 연결된 계정(user_id 있음)만 남기고,
-- 시드로 넣었던 가짜 직원(이일형·최민수 등, user_id 없음)을 제거합니다.
-- 실행: Supabase → SQL Editor → 붙여넣기 → Run.
-- ============================================================================

delete from public.profiles
where user_id is null;

-- 확인: 남은 직원 목록
-- select name, email, role, status from public.profiles order by created_at;
