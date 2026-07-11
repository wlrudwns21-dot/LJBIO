-- ============================================================================
-- LJ-BIO portal — update 5
--   전자결재 승인/날인(상태 변경)은 관리자만. 상신자는 '승인 대기' 상태에서
--   내용만 수정 가능(스스로 승인 불가). Run once on the existing database.
-- ============================================================================

drop policy if exists approvals_update on public.approvals;
drop policy if exists approvals_update_admin on public.approvals;
drop policy if exists approvals_update_drafter on public.approvals;

-- 관리자: 승인/반려/수정 모두 가능
create policy approvals_update_admin on public.approvals
  for update using (public.is_admin()) with check (public.is_admin());

-- 상신자 본인: '대기' 상태에서만, 그리고 상태를 바꿀 수 없음(승인 불가)
create policy approvals_update_drafter on public.approvals
  for update
  using (
    status = 'pending'
    and drafter_id = (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    status = 'pending'
    and drafter_id = (select id from public.profiles where user_id = auth.uid())
  );
