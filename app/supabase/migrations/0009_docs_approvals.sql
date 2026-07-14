-- ============================================================================
-- LJ-BIO — 문서관리 · 전자결재 고도화
--   · profiles: 결제 승인 권한(can_approve) + 대표자 지정(is_ceo)
--   · approvals: 첨부파일(attachments) + 결재선/승인 단계(approval_line)
--   · files:     문서관리 저장 파일명 규칙용 거래처(partner) · 태그(tag)
-- 실행: Supabase → SQL Editor → 붙여넣기 → Run.
-- ============================================================================

alter table public.profiles
  add column if not exists can_approve boolean not null default false,
  add column if not exists is_ceo      boolean not null default false;

alter table public.approvals
  add column if not exists attachments   jsonb not null default '[]'::jsonb,
  add column if not exists approval_line jsonb not null default '[]'::jsonb;

alter table public.files
  add column if not exists partner text default '',
  add column if not exists tag     text default '';

-- 기존 데이터 초기값: 대표이사(이일형) 계정을 기본 대표자로, 관리자/팀장을 기본 결제권한으로
update public.profiles set is_ceo = true
  where lower(email) = 'ilhyung.lee@bio-lj.com';
update public.profiles set can_approve = true
  where role in ('admin', 'manager');

-- ---------------------------------------------------------------------------
-- 접근 제어(RLS) 재정의
--   · 결재 문서 열람: 마스터(지경준)는 전체 · 그 외에는 상신자 본인 또는 결재선 승인자
--   · 결재 문서 결재(업데이트): 마스터 · 결재선 승인자 · (대기중) 상신자 본인
--   · 문서관리 파일 삭제: 마스터(지경준)만
-- ---------------------------------------------------------------------------

-- 현재 로그인 사용자가 결재선(approval_line)에 포함되어 있는지
create or replace function public.is_in_approval_line(line jsonb)
returns boolean language sql stable as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(line, '[]'::jsonb)) e
    where lower(e->>'email') = lower(
      (select email from public.profiles where user_id = auth.uid())
    )
  );
$$;

-- 마스터(총괄) 계정 여부
create or replace function public.is_master()
returns boolean language sql stable as $$
  select lower(coalesce(
    (select email from public.profiles where user_id = auth.uid()), ''
  )) = 'kyungjun.ji@bio-lj.com';
$$;

-- approvals: 열람
drop policy if exists approvals_select on public.approvals;
create policy approvals_select on public.approvals
  for select using (
    public.is_master()
    or drafter_id = (select id from public.profiles where user_id = auth.uid())
    or public.is_in_approval_line(approval_line)
  );

-- approvals: 결재(업데이트) — 관리자 전용 정책을 마스터+결재선 승인자로 대체
drop policy if exists approvals_update_admin on public.approvals;
create policy approvals_update_master on public.approvals
  for update using (public.is_master()) with check (public.is_master());
create policy approvals_update_approver on public.approvals
  for update using (public.is_in_approval_line(approval_line))
  with check (public.is_in_approval_line(approval_line));
-- (approvals_update_drafter: 대기중 상신자 본인 수정 정책은 유지)

-- files: 삭제는 마스터만
drop policy if exists files_delete on public.files;
create policy files_delete on public.files
  for delete using (public.is_master());
