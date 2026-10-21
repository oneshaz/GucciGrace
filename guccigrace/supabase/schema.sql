-- Run in Supabase SQL Editor, once, in a NEW project.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role text not null check(role in ('patient','pharmacist')),
 created_at timestamptz not null default now()
);
create table if not exists public.inventory (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 name text not null, strength text not null default '',
 quantity integer not null check(quantity>=0),
 low_stock_threshold integer not null default 10 check(low_stock_threshold>=0),
 expiry_date date not null,
 created_at timestamptz not null default now()
);
create table if not exists public.scan_history (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 question text not null,
 response text not null,
 created_at timestamptz not null default now()
);
create or replace function public.create_profile_for_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,full_name,role)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),
 case when new.raw_user_meta_data->>'role'='pharmacist' then 'pharmacist' else 'patient' end)
 on conflict(id) do nothing;
 return new;
end;$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_user();
alter table public.profiles enable row level security;
alter table public.inventory enable row level security;
alter table public.scan_history enable row level security;
create policy "Own profile read" on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy "Own inventory read" on public.inventory for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='pharmacist'));
create policy "Own inventory add" on public.inventory for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='pharmacist'));
create policy "Own inventory update" on public.inventory for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='pharmacist')) with check(user_id=(select auth.uid()));
create policy "Own inventory delete" on public.inventory for delete to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='pharmacist'));
create policy "Own scan history read" on public.scan_history for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='patient'));
create policy "Own scan history add" on public.scan_history for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='patient'));
