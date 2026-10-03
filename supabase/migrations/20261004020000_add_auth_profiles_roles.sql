-- Supabase Auth identity layer for Studio accounts and role-gated Admin.
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null default '',
    display_name text not null default '',
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('member', 'admin', 'editor', 'cultural_reviewer', 'partner')),
    created_at timestamptz not null default now(),
    unique (user_id, role)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, display_name, avatar_url)
    values (
        new.id,
        coalesce(new.email, ''),
        coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''),
        new.raw_user_meta_data ->> 'avatar_url'
    )
    on conflict (id) do update set
        email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();

    insert into public.user_roles (user_id, role)
    values (new.id, 'member')
    on conflict do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert or update of raw_user_meta_data on auth.users
    for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, display_name, avatar_url)
select
    id,
    coalesce(email, ''),
    coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'full_name', ''),
    raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select id, 'member'
from auth.users
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "users can read own roles" on public.user_roles;
create policy "users can read own roles"
    on public.user_roles for select
    using (auth.uid() = user_id);

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant all on public.profiles to service_role;
grant all on public.user_roles to service_role;
