-- ============================================================================
-- LJ-BIO portal — schema
-- Mirrors the data model of the Claude Design prototype (project/Portal.dc.html).
-- Run order: 0001_schema → 0002_rls → 0003_seed
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: employee directory + auth linkage + approval gate
--   id      : the directory row (exists even for seeded employees)
--   user_id : the Supabase auth user, set when a person signs up / is linked
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users (id) on delete set null,
  name        text not null,
  email       text unique not null,
  dept        text default '',
  role        text not null default 'staff' check (role in ('staff', 'manager', 'admin')),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  init        text,
  avatar_bg   text default '#0E7B4E',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- segments (사업 부문) — also holds the editable finance figures
-- ---------------------------------------------------------------------------
create table if not exists public.segments (
  id          text primary key,           -- e.g. 'wholesale', 'cosmexp', or a generated key
  name        text not null,
  color       text not null default '#0E7B4E',
  orders      bigint not null default 0,
  revenue     bigint not null default 0,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notices (공지사항)
-- ---------------------------------------------------------------------------
create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  tag         text not null default '중요',
  title       text not null,
  body        text default '',
  author      text default '',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks (업무 과제) + stages + comments
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  country     text default '',
  field       text default 'IT',
  assignee    text default '',
  priority    text not null default '보통' check (priority in ('긴급', '높음', '보통')),
  due         date,
  status      text not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  created_at  timestamptz not null default now()
);

create table if not exists public.task_stages (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  name        text not null,
  status      text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  sort        int not null default 0
);

create table if not exists public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  stage_id    uuid not null references public.task_stages (id) on delete cascade,
  author      text not null,
  init        text,
  avatar_bg   text default '#0E7B4E',
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chat: conversations (전사 단톡방 + 1:1 DM) + messages
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_group    boolean not null default false,
  role_label  text default '',
  init        text,
  avatar_bg   text default '#84908A',
  members     int default 0,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid references public.profiles (id) on delete set null,
  author          text default '',
  init            text,
  avatar_bg       text default '#84908A',
  body            text not null,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- mail (Gmail-style mailbox UI; owner-scoped)
-- ---------------------------------------------------------------------------
create table if not exists public.mails (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles (id) on delete cascade,
  folder      text not null default 'inbox' check (folder in ('inbox', 'sent', 'drafts', 'trash')),
  from_name   text default '',
  from_email  text default '',
  from_init   text,
  avatar_bg   text default '#84908A',
  to_addr     text default '',
  subject     text default '',
  preview     text default '',
  body        text default '',
  unread      boolean not null default false,
  starred     boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  sent_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- approvals (전자결재) — drafter + admin visibility only (see RLS)
-- ---------------------------------------------------------------------------
create table if not exists public.approvals (
  id          uuid primary key default gen_random_uuid(),
  seq         bigserial,                          -- for the LJ-AP-2026-#### number
  type        text not null default '지출',
  title       text not null,
  seg_id      text references public.segments (id) on delete set null,
  drafter     text default '',
  drafter_id  uuid references public.profiles (id) on delete set null,
  d_init      text,
  d_bg        text default '#0E7B4E',
  amount      text default '—',
  due         date,
  content     text default '',
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approver    text,
  approved_at date,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- partners (거래처) + contract types
-- ---------------------------------------------------------------------------
create table if not exists public.contract_types (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  sort          int not null default 0,
  template_url  text,   -- uploaded contract-form file (base64 data URL)
  template_name text
);

create table if not exists public.partners (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  rep           text default '',
  biz_no        text default '',
  biz_type      text default '',
  biz_item      text default '',
  address       text default '',
  phone         text default '',
  contact_name  text default '',
  contact_email text default '',
  deal_type     text default '매출' check (deal_type in ('매출', '매입')),
  seg_id        text references public.segments (id) on delete set null,
  contract_type text default '',
  memo          text default '',
  docs          jsonb not null default '{"bizReg":null,"bankbook":null,"contract":null}'::jsonb,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- files (파일 관리) — segment-tagged document registry
-- ---------------------------------------------------------------------------
create table if not exists public.files (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  ext         text default 'PDF',
  category    text default '',
  seg_id      text references public.segments (id) on delete set null,
  size        text default '',
  uploader    text default '',
  storage_path text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leaves (근태 · HR)
-- ---------------------------------------------------------------------------
create table if not exists public.leaves (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  dept        text default '',
  init        text,
  avatar_bg   text default '#0E7B4E',
  type        text default '연차',
  range       text default '',
  days        text default '',
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- calendar_events (일정 관리)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  type        text default '회의',
  event_date  date,
  day         text,
  mon         text,
  time        text default '',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings (key/value) — company seal image, etc.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

-- helpful indexes
create index if not exists idx_task_stages_task on public.task_stages (task_id);
create index if not exists idx_task_comments_stage on public.task_comments (stage_id);
create index if not exists idx_messages_conversation on public.messages (conversation_id);
create index if not exists idx_mails_owner on public.mails (owner_id);
create index if not exists idx_approvals_drafter on public.approvals (drafter_id);

-- ---------------------------------------------------------------------------
-- inquiries (고객 문의) — submitted from the public site's contact form
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- gmail_accounts — per-user Google refresh token (server-only; see 0007)
-- ---------------------------------------------------------------------------
create table if not exists public.gmail_accounts (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  email         text,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);
