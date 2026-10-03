-- Studio recommendations: curated commerce links and real shooting locations.
-- Keep provider data editorially approved; do not scrape third-party pages at
-- request time or expose provider secrets to the browser.
alter table public.studio_generation_settings
    add column if not exists default_output_type text not null default 'image'
    check (default_output_type in ('image', 'video', 'both'));

create table if not exists public.studio_marketplace_listings (
    id uuid primary key default gen_random_uuid(),
    item_type text not null check (item_type in ('garment', 'accessory')),
    garment_id uuid references public.studio_garments(id) on delete cascade,
    accessory_id uuid references public.studio_accessories(id) on delete cascade,
    provider_name text not null,
    listing_type text not null default 'both' check (listing_type in ('buy', 'rent', 'both')),
    title text not null,
    address text not null default '',
    province text not null default '',
    price_from_vnd numeric(14, 2),
    price_to_vnd numeric(14, 2),
    external_url text not null,
    source_url text,
    verified_at timestamptz,
    sort_order smallint not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint marketplace_item_reference_check check (
        (item_type = 'garment' and garment_id is not null and accessory_id is null)
        or (item_type = 'accessory' and accessory_id is not null and garment_id is null)
    )
);

create table if not exists public.studio_locations (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    address text not null,
    province text not null default '',
    latitude numeric(10, 7),
    longitude numeric(10, 7),
    map_url text not null,
    booking_url text,
    description text not null default '',
    image_url text,
    suitable_contexts jsonb not null default '[]'::jsonb,
    source_url text,
    sort_order smallint not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists studio_marketplace_garment_idx
    on public.studio_marketplace_listings (garment_id, is_active, sort_order);
create index if not exists studio_marketplace_accessory_idx
    on public.studio_marketplace_listings (accessory_id, is_active, sort_order);
create index if not exists studio_locations_context_idx
    on public.studio_locations using gin (suitable_contexts);

alter table public.studio_marketplace_listings enable row level security;
alter table public.studio_locations enable row level security;

drop policy if exists "public can read active marketplace listings" on public.studio_marketplace_listings;
create policy "public can read active marketplace listings"
    on public.studio_marketplace_listings for select
    using (is_active = true);

drop policy if exists "public can read active studio locations" on public.studio_locations;
create policy "public can read active studio locations"
    on public.studio_locations for select
    using (is_active = true);

insert into public.studio_locations
    (slug, name, address, province, latitude, longitude, map_url, description, suitable_contexts, source_url, sort_order)
values
    (
        'van-mieu-quoc-tu-giam',
        'Văn Miếu – Quốc Tử Giám',
        '58 Quốc Tử Giám, Đống Đa',
        'Hà Nội',
        21.0242336,
        105.8410067,
        'https://www.google.com/maps/search/?api=1&query=V%C4%83n+Mi%E1%BA%BFu+Qu%E1%BB%91c+T%E1%BB%AD+Gi%C3%A1m+H%C3%A0+N%E1%BB%99i',
        'Không gian di sản phù hợp ảnh chân dung và bản phối dự lễ. Kiểm tra quy định chụp ảnh trước khi đến.',
        '["ceremony","portrait"]'::jsonb,
        'https://www.openstreetmap.org/node/10591743723',
        1
    ),
    (
        'hoang-thanh-thang-long',
        'Hoàng thành Thăng Long',
        '19C Hoàng Diệu, Ba Đình',
        'Hà Nội',
        21.0362620,
        105.8402826,
        'https://www.google.com/maps/search/?api=1&query=Ho%C3%A0ng+th%C3%A0nh+Th%C4%83ng+Long+H%C3%A0+N%E1%BB%99i',
        'Bối cảnh thành cổ có nhịp kiến trúc rõ, hợp ảnh editorial và trang phục lễ.',
        '["ceremony","portrait","street"]'::jsonb,
        'https://www.openstreetmap.org/relation/21425205',
        2
    ),
    (
        'pho-co-ha-noi',
        'Phố cổ Hà Nội',
        'Khu phố cổ, Hoàn Kiếm',
        'Hà Nội',
        21.0340,
        105.8500,
        'https://www.google.com/maps/search/?api=1&query=Ph%E1%BB%91+c%E1%BB%95+H%C3%A0+N%E1%BB%99i',
        'Nhịp phố đời thường cho bản phối dạo phố; ưu tiên góc chụp không cản trở lối đi.',
        '["street","portrait"]'::jsonb,
        'https://www.openstreetmap.org/search?query=Old%20Quarter%20Hanoi',
        3
    )
on conflict (slug) do update set
    name = excluded.name,
    address = excluded.address,
    province = excluded.province,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    map_url = excluded.map_url,
    description = excluded.description,
    suitable_contexts = excluded.suitable_contexts,
    source_url = excluded.source_url,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
