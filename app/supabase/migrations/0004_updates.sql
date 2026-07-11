-- ============================================================================
-- LJ-BIO portal — update 4
--   1) contract templates (per-type uploaded file)
--   2) wipe temporary 전자결재 seed data
--   3) restrict 파일 관리 to manager+ (staff excluded)
-- Run this once on an already-seeded database (SQL Editor → paste → Run).
-- ============================================================================

-- 1) 계약서 유형별 양식 파일 (base64 data URL) + 파일명
alter table public.contract_types
  add column if not exists template_url  text,
  add column if not exists template_name text;

-- 2) 전자결재 임시 데이터 전체 삭제
delete from public.approvals;

-- 3) 파일 관리: 팀장/관리자만 접근 (일반 직원 제외)
drop policy if exists files_select on public.files;
drop policy if exists files_insert on public.files;
drop policy if exists files_update on public.files;
drop policy if exists files_delete on public.files;
create policy files_select on public.files for select using (public.is_manager_up());
create policy files_insert on public.files for insert with check (public.is_manager_up());
create policy files_update on public.files for update using (public.is_manager_up());
create policy files_delete on public.files for delete using (public.is_manager_up());
