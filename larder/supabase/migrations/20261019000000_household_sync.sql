-- Larder walking skeleton: households, members, and synced inventory.
-- Run once in the Supabase SQL editor (or `supabase db push`). Safe to re-run: everything is idempotent.

-- ── Households & members ──────────────────────────────────────
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our kitchen',
  invite_code text not null unique,
  plan        text not null default 'free' check (plan in ('free', 'plus')),
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '',
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists members_user_idx on public.members (user_id);

-- True when the signed-in user belongs to the household. SECURITY DEFINER so policies on
-- `members` can use it without recursing into themselves.
create or replace function public.is_member(h uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.members m where m.household_id = h and m.user_id = (select auth.uid()));
$$;

-- ── Synced tables ─────────────────────────────────────────────
-- One row per client object. `data` holds the app's JSON for it; deletes are soft
-- (`deleted = true`) so other devices hear about them. `updated_at` is stamped by the server.
do $$
declare t text;
begin
  foreach t in array array['items', 'list_items', 'locations'] loop
    execute format($f$
      create table if not exists public.%I (
        household_id uuid not null references public.households (id) on delete cascade,
        id           text not null,
        data         jsonb not null,
        deleted      boolean not null default false,
        updated_at   timestamptz not null default now(),
        updated_by   uuid default auth.uid(),
        primary key (household_id, id)
      )$f$, t);
    execute format('create index if not exists %I on public.%I (household_id, updated_at)', t || '_updated_idx', t);
  end loop;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['items', 'list_items', 'locations'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before insert or update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ── Row level security ────────────────────────────────────────
alter table public.households enable row level security;
alter table public.members    enable row level security;
alter table public.items      enable row level security;
alter table public.list_items enable row level security;
alter table public.locations  enable row level security;

drop policy if exists "members read household" on public.households;
create policy "members read household" on public.households for select to authenticated using (public.is_member(id));
drop policy if exists "members rename household" on public.households;
create policy "members rename household" on public.households for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists "members see each other" on public.members;
create policy "members see each other" on public.members for select to authenticated using (public.is_member(household_id));
drop policy if exists "members edit own name" on public.members;
create policy "members edit own name" on public.members for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['items', 'list_items', 'locations'] loop
    execute format('drop policy if exists "household members" on public.%I', t);
    execute format('create policy "household members" on public.%I for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id))', t);
  end loop;
end $$;

revoke all on public.households, public.members, public.items, public.list_items, public.locations from anon;
grant select, update on public.households to authenticated;
grant select, update on public.members to authenticated;
grant select, insert, update, delete on public.items, public.list_items, public.locations to authenticated;

-- ── Household actions (the only way to create, join or leave) ─
create or replace function public.new_invite_code()
returns text language plpgsql set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I/L
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end $$;

create or replace function public.create_household(p_name text, p_display_name text)
returns public.households
language plpgsql security definer set search_path = '' as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then raise exception 'already_in_household'; end if;
  insert into public.households (name, invite_code)
    values (coalesce(nullif(trim(p_name), ''), 'Our kitchen'), public.new_invite_code())
    returning * into h;
  insert into public.members (household_id, user_id, display_name, role)
    values (h.id, auth.uid(), coalesce(trim(p_display_name), ''), 'owner');
  return h;
end $$;

create or replace function public.join_household(p_code text, p_display_name text)
returns public.households
language plpgsql security definer set search_path = '' as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then raise exception 'already_in_household'; end if;
  select * into h from public.households where invite_code = upper(trim(p_code));
  if h.id is null then raise exception 'invalid_code'; end if;
  -- Free plan: 2 members. Plus: 6 (build plan, Monetization).
  if (select count(*) from public.members where household_id = h.id) >= (case when h.plan = 'plus' then 6 else 2 end) then
    raise exception 'household_full';
  end if;
  insert into public.members (household_id, user_id, display_name) values (h.id, auth.uid(), coalesce(trim(p_display_name), ''));
  return h;
end $$;

create or replace function public.leave_household()
returns void
language plpgsql security definer set search_path = '' as $$
declare h uuid;
begin
  delete from public.members where user_id = auth.uid() returning household_id into h;
  -- Last one out deletes the household and its data.
  if h is not null and not exists (select 1 from public.members where household_id = h) then
    delete from public.households where id = h;
  end if;
end $$;

revoke execute on function public.create_household(text, text), public.join_household(text, text), public.leave_household(), public.new_invite_code(), public.is_member(uuid) from public, anon;
grant execute on function public.create_household(text, text), public.join_household(text, text), public.leave_household(), public.is_member(uuid) to authenticated;

-- ── Realtime: push row changes to other devices ───────────────
do $$
declare t text;
begin
  foreach t in array array['items', 'list_items', 'locations', 'members'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
