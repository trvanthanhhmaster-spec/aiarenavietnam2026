create table if not exists public.studio_garment_variants (
    id uuid primary key default gen_random_uuid(),
    garment_id uuid not null references public.studio_garments(id) on delete cascade,
    slug text not null unique,
    name text not null,
    description text not null default '',
    silhouette text not null default '',
    material text not null default '',
    pattern_notes text not null default '',
    color_palette jsonb not null default '[]'::jsonb,
    image_url text,
    thumbnail_url text,
    prompt_descriptor text not null default '',
    negative_descriptor text not null default '',
    source_id uuid references public.cultural_sources(id) on delete set null,
    source_url text,
    source_provider text not null default 'curated',
    source_external_id text,
    review_status text not null default 'draft'
        check (review_status in ('draft', 'reviewed', 'published')),
    sort_order smallint not null default 0,
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.studio_accessory_variants (
    id uuid primary key default gen_random_uuid(),
    accessory_id uuid not null references public.studio_accessories(id) on delete cascade,
    slug text not null unique,
    name text not null,
    description text not null default '',
    material text not null default '',
    color_palette jsonb not null default '[]'::jsonb,
    image_url text,
    thumbnail_url text,
    prompt_descriptor text not null default '',
    source_id uuid references public.cultural_sources(id) on delete set null,
    source_url text,
    source_provider text not null default 'curated',
    source_external_id text,
    review_status text not null default 'draft'
        check (review_status in ('draft', 'reviewed', 'published')),
    sort_order smallint not null default 0,
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists studio_garment_variants_parent_idx
    on public.studio_garment_variants (garment_id, sort_order);
create index if not exists studio_accessory_variants_parent_idx
    on public.studio_accessory_variants (accessory_id, sort_order);
create unique index if not exists studio_garment_variants_provider_item_idx
    on public.studio_garment_variants (source_provider, source_external_id)
    where source_external_id is not null;
create unique index if not exists studio_accessory_variants_provider_item_idx
    on public.studio_accessory_variants (source_provider, source_external_id)
    where source_external_id is not null;

alter table public.studio_garment_variants enable row level security;
alter table public.studio_accessory_variants enable row level security;

drop policy if exists "public can read published garment variants" on public.studio_garment_variants;
create policy "public can read published garment variants"
    on public.studio_garment_variants for select
    using (is_active = true and review_status = 'published');

drop policy if exists "public can read published accessory variants" on public.studio_accessory_variants;
create policy "public can read published accessory variants"
    on public.studio_accessory_variants for select
    using (is_active = true and review_status = 'published');

insert into public.studio_garment_variants (
    garment_id, slug, name, description, silhouette, material, pattern_notes,
    color_palette, image_url, thumbnail_url, prompt_descriptor,
    negative_descriptor, source_id, source_url, source_provider,
    review_status, sort_order, is_active
)
select
    garment.id,
    garment.slug || '-mau-luu-tru',
    garment.name || ' — mẫu lưu trữ',
    garment.description,
    garment.category,
    'Chất liệu theo tư liệu đã duyệt',
    'Giữ đúng chi tiết nhận diện của loại trang phục',
    coalesce(garment.default_colors, '[]'::jsonb),
    garment.image_url,
    garment.thumbnail_url,
    garment.prompt_descriptor,
    garment.negative_descriptor,
    garment.source_id,
    source.source_url,
    'curated',
    'published',
    1,
    true
from public.studio_garments garment
left join public.cultural_sources source on source.id = garment.source_id
on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    image_url = excluded.image_url,
    thumbnail_url = excluded.thumbnail_url,
    prompt_descriptor = excluded.prompt_descriptor,
    negative_descriptor = excluded.negative_descriptor,
    source_id = excluded.source_id,
    source_url = excluded.source_url,
    review_status = 'published',
    is_active = true,
    updated_at = now();

insert into public.studio_accessory_variants (
    accessory_id, slug, name, description, material, color_palette,
    image_url, thumbnail_url, prompt_descriptor, source_provider,
    review_status, sort_order, is_active
)
select
    accessory.id,
    accessory.slug || '-mau-catalog',
    accessory.name || ' — mẫu catalog',
    accessory.description,
    'Chất liệu theo ảnh tham chiếu',
    '[]'::jsonb,
    accessory.image_url,
    accessory.thumbnail_url,
    accessory.prompt_descriptor,
    'curated',
    'published',
    1,
    true
from public.studio_accessories accessory
on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    image_url = excluded.image_url,
    thumbnail_url = excluded.thumbnail_url,
    prompt_descriptor = excluded.prompt_descriptor,
    review_status = 'published',
    is_active = true,
    updated_at = now();
