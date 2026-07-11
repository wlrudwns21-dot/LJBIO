-- ============================================================================
-- LJ-BIO portal — update 7: keep Gmail connected (refresh-token store)
-- Holds each user's Google refresh token so the gmail-auth Edge Function can
-- mint fresh access tokens. RLS is ON with NO client policies → the browser
-- can never read/write this table; only the Edge Function (service role) can.
-- Run once on the existing database.
-- ============================================================================

create table if not exists public.gmail_accounts (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  email         text,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);

alter table public.gmail_accounts enable row level security;
-- (intentionally no policies — service role bypasses RLS; clients get nothing)
