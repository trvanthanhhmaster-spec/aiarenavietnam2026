-- Fashion network v1: curated directory and contact, not checkout or live inventory.
-- Writes are transactional service-only RPCs; PHP supplies its authenticated user ID.
create table public.fashion_shops (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  province text not null check (char_length(province) between 2 and 120),
  address text not null default '' check (char_length(address) <= 300),
  contact_url text not null check (contact_url ~ '^https://[^[:space:]]+$'),
  website_url text not null default '' check (website_url = '' or website_url ~ '^https://[^[:space:]]+$'),
  status text not null default 'pending' check (status in ('pending','published','rejected','archived')),
  review_note text not null default '',
  verified_at timestamptz,
  revision bigint not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.fashion_shop_members (
  shop_id uuid not null references public.fashion_shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (shop_id,user_id)
);
create table public.fashion_products (
  id uuid primary key,
  shop_id uuid not null references public.fashion_shops(id),
  garment_id uuid not null references public.studio_garments(id),
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '' check (char_length(description) <= 3000),
  source_url text not null check (source_url ~ '^https://[^[:space:]]+$'),
  extraction_method text not null default 'merchant' check (extraction_method in ('merchant','manual','feed','website')),
  fetched_at timestamptz not null default now(), verified_at timestamptz,
  status text not null default 'pending' check (status in ('pending','published','rejected','archived')),
  review_note text not null default '',
  revision bigint not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.fashion_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.fashion_products(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  color text not null default '', material text not null default '', pattern text not null default '',
  sizes text not null default '', included_accessories text not null default '',
  availability text not null default 'unknown' check (availability in ('unknown','contact','available','unavailable')),
  availability_checked_at timestamptz,
  check (availability not in ('available','unavailable') or availability_checked_at is not null)
);
create table public.fashion_product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.fashion_products(id) on delete cascade,
  image_url text not null check (image_url ~ '^https://[^[:space:]]+$'),
  display_permission text not null check (display_permission in ('unknown','granted')),
  ai_permission text not null default 'not_granted' check (ai_permission in ('not_granted','requested','granted')),
  permission_evidence text not null default '',
  permission_verified_at timestamptz,
  check (ai_permission <> 'granted' or (permission_verified_at is not null and permission_evidence <> ''))
);
create table public.fashion_product_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.fashion_products(id) on delete cascade,
  kind text not null check (kind in ('buy','rent','made_to_order')),
  price_vnd numeric(14,0) check (price_vnd >= 0),
  deposit_vnd numeric(14,0) check (deposit_vnd >= 0),
  unit text not null check (char_length(unit) between 1 and 80),
  terms text not null default '' check (char_length(terms) <= 1500),
  checked_at timestamptz,
  unique (product_id,kind),
  check (price_vnd is null or checked_at is not null)
);
create table public.fashion_review_log (
  id bigint generated always as identity primary key,
  entity_type text not null, entity_id uuid not null,
  actor_id uuid not null references auth.users(id),
  action text not null, note text not null default '',
  revision bigint not null, created_at timestamptz not null default now()
);
create index fashion_product_shop_idx on public.fashion_products(shop_id,status);
create index fashion_shop_status_idx on public.fashion_shops(status,province);

-- Public reads reveal published records only. No private membership/review evidence.
alter table public.fashion_shops enable row level security;
alter table public.fashion_shop_members enable row level security;
alter table public.fashion_products enable row level security;
alter table public.fashion_product_variants enable row level security;
alter table public.fashion_product_media enable row level security;
alter table public.fashion_product_offers enable row level security;
alter table public.fashion_review_log enable row level security;
create policy fashion_public_shops on public.fashion_shops for select using (status='published');
create policy fashion_public_products on public.fashion_products for select using (
  status='published' and exists (select 1 from public.fashion_shops s where s.id=shop_id and s.status='published')
);
create policy fashion_public_variants on public.fashion_product_variants for select using (
  exists (select 1 from public.fashion_products p where p.id=product_id)
);
create policy fashion_public_media on public.fashion_product_media for select using (
  display_permission='granted' and exists (select 1 from public.fashion_products p where p.id=product_id)
);
create policy fashion_public_offers on public.fashion_product_offers for select using (
  exists (select 1 from public.fashion_products p where p.id=product_id)
);
revoke all on public.fashion_shops,public.fashion_shop_members,public.fashion_products,
 public.fashion_product_variants,public.fashion_product_media,public.fashion_product_offers,public.fashion_review_log from anon,authenticated;
grant select on public.fashion_shops,public.fashion_products,public.fashion_product_variants,public.fashion_product_offers to anon,authenticated;
-- Never expose evidence documents through anon/ordinary authenticated REST.
grant select (id,product_id,image_url,display_permission,ai_permission) on public.fashion_product_media to anon,authenticated;
grant all on public.fashion_shops,public.fashion_shop_members,public.fashion_products,
 public.fashion_product_variants,public.fashion_product_media,public.fashion_product_offers,public.fashion_review_log to service_role;
grant usage,select on sequence public.fashion_review_log_id_seq to service_role;

create function public.fashion_submit_shop(actor uuid, entity uuid, expected bigint, data jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare current_revision bigint; result jsonb;
begin
  -- Serializes registrations for this user, including duplicate submission requests.
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  if not exists(select 1 from auth.users where id=actor) then raise exception 'FORBIDDEN'; end if;
  select revision into current_revision from fashion_shops where id=entity for update;
  if current_revision is null then
    if expected<>0 then raise exception 'CONFLICT'; end if;
    if (select count(*) from fashion_shop_members where user_id=actor)>=3 then raise exception 'LIMIT'; end if;
    insert into fashion_shops(id,name,description,province,address,contact_url,website_url)
      values(entity,data->>'name',data->>'description',data->>'province',data->>'address',data->>'contact_url',data->>'website_url');
    insert into fashion_shop_members(shop_id,user_id) values(entity,actor);
  else
    if not exists(select 1 from fashion_shop_members where shop_id=entity and user_id=actor) then raise exception 'FORBIDDEN'; end if;
    if expected<>current_revision then raise exception 'CONFLICT'; end if;
    update fashion_shops set name=data->>'name',description=data->>'description',province=data->>'province',address=data->>'address',
      contact_url=data->>'contact_url',website_url=data->>'website_url',status='pending',verified_at=null,review_note='',revision=revision+1,updated_at=now() where id=entity;
  end if;
  select to_jsonb(s) into result from fashion_shops s where id=entity;
  insert into fashion_review_log(entity_type,entity_id,actor_id,action,revision) values('shop',entity,actor,'submit',(result->>'revision')::bigint);
  return result;
end $$;

create function public.fashion_submit_product(actor uuid, shop uuid, entity uuid, expected bigint, data jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare current_revision bigint; result jsonb; item jsonb;
begin
  -- Lock parent first: concurrent creations cannot exceed the per-shop limit.
  perform 1 from fashion_shops where id=shop for update;
  if not exists(select 1 from fashion_shop_members where shop_id=shop and user_id=actor) then raise exception 'FORBIDDEN'; end if;
  select revision into current_revision from fashion_products where id=entity for update;
  if current_revision is null then
    if expected<>0 then raise exception 'CONFLICT'; end if;
    if (select count(*) from fashion_products where shop_id=shop)>=100 then raise exception 'LIMIT'; end if;
    insert into fashion_products(id,shop_id,garment_id,name,description,source_url)
      values(entity,shop,(data->>'garment_id')::uuid,data->>'name',data->>'description',data->>'source_url');
  else
    if not exists(select 1 from fashion_products where id=entity and shop_id=shop) then raise exception 'FORBIDDEN'; end if;
    if expected<>current_revision then raise exception 'CONFLICT'; end if;
    update fashion_products set garment_id=(data->>'garment_id')::uuid,name=data->>'name',description=data->>'description',source_url=data->>'source_url',
      status='pending',verified_at=null,review_note='',revision=revision+1,fetched_at=now(),updated_at=now() where id=entity;
    delete from fashion_product_variants where product_id=entity;
    delete from fashion_product_media where product_id=entity;
    delete from fashion_product_offers where product_id=entity;
  end if;
  -- v1 form submits one variant/image; schema can retain multiple in later adapters.
  insert into fashion_product_variants(product_id,name,color,material,pattern,sizes,included_accessories,availability)
    values(entity,data->>'variant_name',data->>'color',data->>'material',data->>'pattern',data->>'sizes',data->>'included_accessories','contact');
  insert into fashion_product_media(product_id,image_url,display_permission,ai_permission,permission_evidence)
    values(entity,data->>'image_url','granted',case when data->>'ai_permission'='requested' then 'requested' else 'not_granted' end,data->>'permission_evidence');
  if jsonb_array_length(data->'offers') not between 1 and 3 then raise exception 'INVALID_OFFERS'; end if;
  for item in select * from jsonb_array_elements(data->'offers') loop
    insert into fashion_product_offers(product_id,kind,price_vnd,deposit_vnd,unit,terms,checked_at)
      values(entity,item->>'kind',(item->>'price_vnd')::numeric,(item->>'deposit_vnd')::numeric,item->>'unit',item->>'terms',now());
  end loop;
  select to_jsonb(p) into result from fashion_products p where id=entity;
  insert into fashion_review_log(entity_type,entity_id,actor_id,action,revision) values('product',entity,actor,'submit',(result->>'revision')::bigint);
  return result;
end $$;

create function public.fashion_review(actor uuid, kind text, entity uuid, expected bigint, decision text, note text, allow_ai boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare current_revision bigint; parent uuid;
begin
  if not exists(select 1 from public.user_roles where user_id=actor and role='admin') then raise exception 'FORBIDDEN'; end if;
  if decision not in ('published','rejected','archived') or char_length(note)>2000 then raise exception 'INVALID_REVIEW'; end if;
  if decision='rejected' and char_length(trim(note))<5 then raise exception 'REVIEW_NOTE_REQUIRED'; end if;
  if kind='shop' then
    select revision into current_revision from fashion_shops where id=entity for update;
    if current_revision is null or current_revision<>expected then raise exception 'CONFLICT'; end if;
    update fashion_shops set status=decision,review_note=note,verified_at=case when decision='published' then now() else null end,revision=revision+1,updated_at=now() where id=entity;
  elsif kind='product' then
    select shop_id into parent from fashion_products where id=entity;
    perform 1 from fashion_shops where id=parent for update;
    select revision into current_revision from fashion_products where id=entity for update;
    if current_revision is null or current_revision<>expected then raise exception 'CONFLICT'; end if;
    if decision='published' then
      if not exists(select 1 from fashion_shops where id=parent and status='published') then raise exception 'SHOP_NOT_PUBLISHED'; end if;
      if not exists(select 1 from fashion_product_media where product_id=entity and display_permission='granted' and char_length(permission_evidence)>=5) then raise exception 'PERMISSION_REQUIRED'; end if;
      if allow_ai and not exists(select 1 from fashion_product_media where product_id=entity and ai_permission in ('requested','granted') and char_length(permission_evidence)>=5) then raise exception 'AI_PERMISSION_REQUIRED'; end if;
    end if;
    update fashion_product_media set ai_permission=case when allow_ai and decision='published' then 'granted' else 'not_granted' end,
      permission_verified_at=case when decision='published' then now() else null end where product_id=entity;
    update fashion_products set status=decision,review_note=note,verified_at=case when decision='published' then now() else null end,revision=revision+1,updated_at=now() where id=entity;
  else raise exception 'INVALID_KIND'; end if;
  insert into fashion_review_log(entity_type,entity_id,actor_id,action,note,revision) values(kind,entity,actor,decision,note,current_revision+1);
  return jsonb_build_object('id',entity,'status',decision,'revision',current_revision+1);
end $$;
revoke all on function public.fashion_submit_shop(uuid,uuid,bigint,jsonb),public.fashion_submit_product(uuid,uuid,uuid,bigint,jsonb),public.fashion_review(uuid,text,uuid,bigint,text,text,boolean) from public,anon,authenticated;
grant execute on function public.fashion_submit_shop(uuid,uuid,bigint,jsonb),public.fashion_submit_product(uuid,uuid,uuid,bigint,jsonb),public.fashion_review(uuid,text,uuid,bigint,text,text,boolean) to service_role;
notify pgrst,'reload schema';
