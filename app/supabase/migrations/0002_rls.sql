-- ============================================================================
-- LJ-BIO portal — Row Level Security + auth trigger
-- ============================================================================

-- --- helpers ----------------------------------------------------------------
-- Current signed-in user's directory profile (by auth linkage).
create or replace function public.current_profile()
returns public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and status = 'approved' and role = 'admin'
  );
$$;

create or replace function public.is_manager_up()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and status = 'approved' and role in ('admin', 'manager')
  );
$$;

-- --- new-user handler -------------------------------------------------------
-- On signup: link to an existing directory row with the same email (inheriting
-- its role/status — this is how a seeded employee "claims" their account), or
-- create a fresh pending profile awaiting admin approval.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  linked int;
begin
  update public.profiles
     set user_id = new.id
   where email = new.email and user_id is null;
  get diagnostics linked = row_count;

  if linked = 0 then
    insert into public.profiles (user_id, email, name, dept, role, status, init, avatar_bg)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
      coalesce(new.raw_user_meta_data ->> 'dept', ''),
      coalesce(new.raw_user_meta_data ->> 'role', 'staff'),
      'pending',
      left(coalesce(new.raw_user_meta_data ->> 'name', new.email), 1),
      '#0E7B4E'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- enable RLS everywhere ---------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.segments        enable row level security;
alter table public.notices         enable row level security;
alter table public.tasks           enable row level security;
alter table public.task_stages     enable row level security;
alter table public.task_comments   enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;
alter table public.mails           enable row level security;
alter table public.approvals       enable row level security;
alter table public.contract_types  enable row level security;
alter table public.partners        enable row level security;
alter table public.files           enable row level security;
alter table public.leaves          enable row level security;
alter table public.calendar_events enable row level security;
alter table public.settings        enable row level security;

-- --- profiles ---------------------------------------------------------------
-- Everyone signed in can read the directory (needed for assignee pickers etc.);
-- you can tighten to is_approved() if you prefer.
create policy profiles_select on public.profiles
  for select using (auth.uid() is not null);
create policy profiles_update_self on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin());
create policy profiles_admin_insert on public.profiles
  for insert with check (public.is_admin());
create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- --- shared work tables: approved users read; write rules per table ----------
-- Convenience: readable + full CRUD for approved users on collaborative data.
do $$
declare t text;
begin
  foreach t in array array[
    'notices', 'tasks', 'task_stages', 'task_comments',
    'conversations', 'messages', 'files', 'calendar_events'
  ] loop
    execute format('create policy %I_select on public.%I for select using (public.is_approved());', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (public.is_approved());', t, t);
    execute format('create policy %I_update on public.%I for update using (public.is_approved());', t, t);
    execute format('create policy %I_delete on public.%I for delete using (public.is_approved());', t, t);
  end loop;
end $$;

-- --- segments / contract_types: read approved, write manager+ ---------------
do $$
declare t text;
begin
  foreach t in array array['segments', 'contract_types'] loop
    execute format('create policy %I_select on public.%I for select using (public.is_approved());', t, t);
    execute format('create policy %I_write on public.%I for all using (public.is_manager_up()) with check (public.is_manager_up());', t, t);
  end loop;
end $$;

-- --- partners / leaves: read approved, create approved, decide manager+ ------
create policy partners_select on public.partners for select using (public.is_approved());
create policy partners_write  on public.partners for all using (public.is_approved()) with check (public.is_approved());

create policy leaves_select on public.leaves for select using (public.is_approved());
create policy leaves_insert on public.leaves for insert with check (public.is_approved());
create policy leaves_decide on public.leaves for update using (public.is_manager_up());
create policy leaves_delete on public.leaves for delete using (public.is_manager_up());

-- --- approvals: drafter + admin visibility; only admin decides --------------
create policy approvals_select on public.approvals
  for select using (public.is_admin() or drafter_id = (select id from public.profiles where user_id = auth.uid()));
create policy approvals_insert on public.approvals
  for insert with check (public.is_approved());
create policy approvals_update on public.approvals
  for update using (
    public.is_admin()
    or drafter_id = (select id from public.profiles where user_id = auth.uid())
  );
create policy approvals_delete on public.approvals
  for delete using (public.is_admin());

-- --- mails: strictly owner-scoped -------------------------------------------
create policy mails_all on public.mails
  for all
  using (owner_id = (select id from public.profiles where user_id = auth.uid()))
  with check (owner_id = (select id from public.profiles where user_id = auth.uid()));

-- --- settings: read approved, write admin -----------------------------------
create policy settings_select on public.settings for select using (public.is_approved());
create policy settings_write  on public.settings for all using (public.is_admin()) with check (public.is_admin());
