-- One private working draft per account. Tombstones keep stale tabs from reviving a cleared draft.
create table public.studio_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint studio_draft_size check (payload is null or octet_length(payload::text) <= 100000)
);
alter table public.studio_drafts enable row level security;
create policy "Read own Studio draft" on public.studio_drafts for select to authenticated using (auth.uid() = user_id);
revoke all on public.studio_drafts from anon, authenticated;
grant select on public.studio_drafts to authenticated;
grant all on public.studio_drafts to service_role;

create or replace function public.write_studio_draft(p_user uuid, p_payload jsonb, p_revision bigint)
returns setof public.studio_drafts language plpgsql security definer set search_path = public as $$
declare current_revision bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('studio-draft:' || p_user::text, 0));
  select revision into current_revision from public.studio_drafts where user_id = p_user;
  if coalesce(current_revision, 0) <> p_revision then
    raise exception using errcode = 'P0001', message = 'STUDIO_DRAFT_CONFLICT';
  end if;
  return query insert into public.studio_drafts(user_id, payload, revision, updated_at)
    values(p_user, p_payload, p_revision + 1, now())
    on conflict(user_id) do update set payload = excluded.payload, revision = excluded.revision, updated_at = excluded.updated_at
    returning *;
end $$;
revoke all on function public.write_studio_draft(uuid,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.write_studio_draft(uuid,jsonb,bigint) to service_role;
