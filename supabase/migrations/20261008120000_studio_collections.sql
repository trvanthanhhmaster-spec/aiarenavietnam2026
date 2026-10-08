-- Collections are independent records; deleted IDs remain tombstones.
create table public.studio_collections (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (octet_length(payload::text) <= 100000)
);
alter table public.studio_collections enable row level security;
create policy "Read own collections" on public.studio_collections for select to authenticated using (auth.uid() = user_id);
revoke all on public.studio_collections from anon, authenticated;
grant select on public.studio_collections to authenticated;
grant all on public.studio_collections to service_role;
alter table public.generation_jobs add column collection_id uuid;
alter table public.generation_jobs add column deleted_at timestamptz;
alter table public.looks add column deleted_at timestamptz;
create index generation_jobs_collection_idx on public.generation_jobs(collection_id,created_at);

-- Preserve explicit old collections only. Never import all generation history.
insert into public.studio_collections(id,user_id,name,payload,deleted_at)
select (item->>'id')::uuid,d.user_id,left(coalesce(nullif(item->>'name',''),'Bộ sưu tập'),120),
  item->'record', case when item->'record'->>'savedLookId' is not null and not exists
  (select 1 from public.looks l where l.id::text=item->'record'->>'savedLookId' and l.user_id=d.user_id) then now() else null end
from public.studio_drafts d cross join lateral jsonb_array_elements(coalesce(d.payload->'collections','[]'::jsonb)) item
where item->>'id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
on conflict do nothing;
insert into public.studio_collections(id,user_id,name,payload)
select gen_random_uuid(),d.user_id,'Bộ sưu tập trước',d.payload - 'collections' - 'collectionId'
from public.studio_drafts d where d.payload is not null and not (d.payload ? 'collections')
and (nullif(d.payload->'draft'->>'event','') is not null or d.payload->>'jobId' is not null)
and not exists(select 1 from public.studio_collections c where c.user_id=d.user_id);

-- Attach previously stored chains to their collection without changing images.
update public.generation_jobs j set collection_id=c.id
from public.studio_collections c join public.generation_jobs anchor on anchor.id::text=c.payload->>'jobId'
where j.collection_id is null and j.user_id=c.user_id and
  coalesce(j.input->'history'->>'rootJobId',j.id::text)=coalesce(anchor.input->'history'->>'rootJobId',anchor.id::text);

create function public.write_studio_collections(p_user uuid,p_items jsonb,p_owner text)
returns setof public.studio_collections language plpgsql security definer set search_path=public as $$
declare item jsonb; old public.studio_collections; ident uuid; anchor public.generation_jobs; root text;
begin
  perform pg_advisory_xact_lock(hashtextextended('studio-collections:'||p_user::text,0));
  for item in select value from jsonb_array_elements(p_items) loop
    ident=(item->>'id')::uuid;
    select * into old from public.studio_collections where id=ident;
    if found then
      if old.user_id<>p_user or old.deleted_at is not null or old.revision<>(item->>'revision')::bigint then
        raise exception using message='STUDIO_COLLECTION_CONFLICT';
      end if;
      if old.payload<>item->'record' or old.name<>item->>'name' or coalesce((item->>'deleted')::boolean,false) then
        update public.studio_collections set payload=item->'record',name=item->>'name',revision=revision+1,
          updated_at=now(),deleted_at=case when coalesce((item->>'deleted')::boolean,false) then now() end where id=ident;
      end if;
    else
      if (item->>'revision')::bigint<>0 then raise exception using message='STUDIO_COLLECTION_CONFLICT'; end if;
      insert into public.studio_collections(id,user_id,name,payload) values(ident,p_user,item->>'name',item->'record');
    end if;
    if coalesce((item->>'deleted')::boolean,false) then
      update public.studio_collections set deleted_at=coalesce(deleted_at,now()) where id=ident;
      update public.generation_jobs set deleted_at=coalesce(deleted_at,now()) where collection_id=ident and user_id=p_user;
      update public.looks set deleted_at=coalesce(deleted_at,now()) where user_id=p_user and generation_job_id in
        (select id from public.generation_jobs where collection_id=ident and user_id=p_user);
    end if;
    if item->'record'->>'jobId' is not null and not coalesce((item->>'deleted')::boolean,false) then
      select * into anchor from public.generation_jobs where id=(item->'record'->>'jobId')::uuid;
      if not found or anchor.deleted_at is not null or not coalesce(anchor.user_id=p_user or (anchor.user_id is null and anchor.owner_session_hash=p_owner),false) then raise exception using message='VERSION_NOT_FOUND';end if;
      root=coalesce(anchor.input->'history'->>'rootJobId',anchor.id::text);
      update public.generation_jobs set user_id=p_user where user_id is null and owner_session_hash=p_owner
        and (id::text=root or input->'history'->>'rootJobId'=root);
      update public.generation_jobs set collection_id=ident where collection_id is null and user_id=p_user
        and (id::text=root or input->'history'->>'rootJobId'=root);
    end if;
    return query select * from public.studio_collections where id=ident;
  end loop;
end $$;
revoke all on function public.write_studio_collections(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.write_studio_collections(uuid,jsonb,text) to service_role;

-- Saved legacy images get a home once, without resurrecting deleted bookmarks.
insert into public.studio_collections(id,user_id,name,payload)
select gen_random_uuid(),l.user_id,left(coalesce(nullif(l.name,''),'Bộ sưu tập đã lưu'),120),
 jsonb_build_object('draft',l.selection,'selection',l.selection,'jobId',l.generation_job_id,'savedLookId',l.id,'saveId',l.client_save_id,'guideStep','review')
from (select distinct on (l.user_id,coalesce(j.input->'history'->>'rootJobId',l.generation_job_id::text,l.id::text)) l.*
 from public.looks l left join public.generation_jobs j on j.id=l.generation_job_id
 order by l.user_id,coalesce(j.input->'history'->>'rootJobId',l.generation_job_id::text,l.id::text),l.created_at desc,l.id) l
where not exists(select 1 from public.studio_collections c where c.user_id=l.user_id
 and (c.payload->>'savedLookId'=l.id::text or c.payload->>'jobId'=l.generation_job_id::text))
and not exists(select 1 from public.generation_jobs j where j.id=l.generation_job_id and j.collection_id is not null);
update public.generation_jobs j set collection_id=c.id from public.studio_collections c
where j.collection_id is null and j.user_id=c.user_id and c.payload->>'jobId'=j.id::text;
update public.generation_jobs j set collection_id=anchor.collection_id from public.generation_jobs anchor
where j.collection_id is null and anchor.collection_id is not null and j.user_id=anchor.user_id
and coalesce(j.input->'history'->>'rootJobId',j.id::text)=coalesce(anchor.input->'history'->>'rootJobId',anchor.id::text);

update public.generation_jobs j set deleted_at=now() from public.studio_collections c where j.collection_id=c.id and c.deleted_at is not null and j.user_id=c.user_id;
update public.looks l set deleted_at=now() from public.generation_jobs j where l.generation_job_id=j.id and l.user_id=j.user_id and j.deleted_at is not null;

create function public.hide_studio_version(p_user uuid,p_collection uuid,p_job uuid,p_revision bigint)
returns setof public.studio_collections language plpgsql security definer set search_path=public as $$
declare c public.studio_collections;
begin
 perform pg_advisory_xact_lock(hashtextextended('studio-collections:'||p_user::text,0));
 select * into c from public.studio_collections where id=p_collection and user_id=p_user and deleted_at is null;
 if not found or c.revision<>p_revision then raise exception using message='STUDIO_COLLECTION_CONFLICT';end if;
 if not exists(select 1 from public.generation_jobs where id=p_job and user_id=p_user and collection_id=p_collection and deleted_at is null) then raise exception using message='VERSION_NOT_FOUND';end if;
 update public.generation_jobs set deleted_at=now() where id=p_job;
 update public.looks set deleted_at=now() where user_id=p_user and generation_job_id=p_job;
 update public.studio_collections set revision=revision+1,updated_at=now(),payload=case when payload->>'jobId'=p_job::text
 then payload||jsonb_build_object('jobId',null,'savedLookId',null,'saveId',null,'selection',null) else payload end where id=p_collection;
 return query select * from public.studio_collections where id=p_collection;
end $$;
revoke all on function public.hide_studio_version(uuid,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.hide_studio_version(uuid,uuid,uuid,bigint) to service_role;
