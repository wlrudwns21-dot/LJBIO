-- ============================================================================
-- LJ-BIO — update 17: 추석 선물 배송 신청 (public order form → portal)
-- 비로그인 고객도 신청 가능, 승인된 임직원만 열람/상태변경/삭제. 한 번만 실행.
-- ============================================================================

create table if not exists public.gift_orders (
  id                uuid primary key default gen_random_uuid(),
  product           text not null,
  price             integer default 0,
  quantity          integer not null default 1,
  recipient_name    text not null,
  recipient_phone   text not null,
  recipient_address text not null,
  address_detail    text default '',
  delivery_date     date,
  sender_name       text default '',
  sender_phone      text default '',
  memo              text default '',
  status            text not null default 'new'
                    check (status in ('new', 'confirmed', 'shipped', 'done', 'canceled')),
  created_at        timestamptz not null default now()
);

alter table public.gift_orders enable row level security;

drop policy if exists gift_orders_insert on public.gift_orders;
create policy gift_orders_insert on public.gift_orders
  for insert to anon, authenticated with check (true);

drop policy if exists gift_orders_select on public.gift_orders;
create policy gift_orders_select on public.gift_orders
  for select using (public.is_approved());
drop policy if exists gift_orders_update on public.gift_orders;
create policy gift_orders_update on public.gift_orders
  for update using (public.is_approved());
drop policy if exists gift_orders_delete on public.gift_orders;
create policy gift_orders_delete on public.gift_orders
  for delete using (public.is_approved());
