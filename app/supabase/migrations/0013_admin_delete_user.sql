-- ============================================================================
-- LJ-BIO — 직원 삭제/가입 거절 시 로그인 계정까지 함께 삭제
-- 프로필만 지우면 auth 이메일이 남아 "이미 등록된 사용자"로 재가입이 막히는
-- 문제를 방지합니다. 관리자(is_admin)만 실행 가능.
-- ※ 이 마이그레이션은 2026-07-16 Supabase에 이미 적용되어 있습니다.
-- ============================================================================

create or replace function public.admin_delete_user(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select user_id into v_user from public.profiles where id = p_profile_id;
  delete from public.profiles where id = p_profile_id;
  if v_user is not null then
    delete from auth.users where id = v_user;
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
