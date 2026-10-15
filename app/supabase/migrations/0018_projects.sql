-- ============================================================================
-- LJ-BIO — update 18: 프로젝트 (업무 과제·문서를 프로젝트 단위로 정리)
-- 승인된 임직원만 생성/열람/수정/삭제. tasks·files 에 project_id 연결.
-- ============================================================================

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  color       text default '#0E7B4E',
  status      text not null default 'active' check (status in ('active', 'done', 'archived')),
  created_by  text default '',
  created_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select using (public.is_approved());
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated with check (public.is_approved());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update using (public.is_approved());
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete using (public.is_approved());

-- 과제·파일을 프로젝트에 연결 (프로젝트 삭제 시 연결만 해제, 항목은 보존)
alter table public.tasks add column if not exists project_id uuid references public.projects (id) on delete set null;
alter table public.files add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists files_project_idx on public.files (project_id);
