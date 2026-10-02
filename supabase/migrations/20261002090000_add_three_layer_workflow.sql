-- Three-layer V-Remix workflow: Tier 1 context, Studio looks and Admin moderation.
alter table public.experience_branches
    add column if not exists studio_event_slug text references public.studio_events(slug) on delete set null,
    add column if not exists thumbnail_url text;

update public.experience_branches
set studio_event_slug = case branch_key
    when 'dihoc' then 'school'
    when 'daopho' then 'street'
    when 'dule' then 'ceremony'
    when 'chupanh' then 'portrait'
    else studio_event_slug
end
where studio_event_slug is null;

alter table public.studio_events
    add column if not exists preset jsonb not null default '{}'::jsonb;

update public.studio_events
set preset = case slug
    when 'school' then '{"location":"Hà Nội","season":"Mùa thu","garment":"ao-ngu-than-tay-chen","color":"indigo","style":"school-polished","scene":"campus"}'::jsonb
    when 'street' then '{"location":"Phố cổ Hà Nội","season":"Mùa thu","garment":"ao-tu-than","color":"moss","style":"streetwear","scene":"old-quarter"}'::jsonb
    when 'ceremony' then '{"location":"Văn Miếu","season":"Mùa thu","garment":"ao-tac","color":"vermilion","style":"elegant","scene":"temple"}'::jsonb
    when 'portrait' then '{"location":"Studio","season":"Bốn mùa","garment":"ao-nhat-binh","color":"ivory","style":"heritage-editorial","scene":"studio"}'::jsonb
    else preset
end;

alter table public.studio_garments
    add column if not exists thumbnail_url text,
    add column if not exists prompt_descriptor text not null default '',
    add column if not exists negative_descriptor text not null default '',
    add column if not exists allowed_contexts jsonb not null default '[]'::jsonb,
    add column if not exists default_colors jsonb not null default '[]'::jsonb;

alter table public.studio_accessories
    add column if not exists thumbnail_url text,
    add column if not exists prompt_descriptor text not null default '',
    add column if not exists compatibility jsonb not null default '{}'::jsonb;

alter table public.studio_options
    drop constraint if exists studio_options_option_type_check;
alter table public.studio_options
    add constraint studio_options_option_type_check
    check (option_type in ('color', 'style', 'pattern', 'scene'));

insert into public.studio_options (option_type, slug, label, value, prompt_hint, sort_order)
values
    ('color', 'beige', 'Beige', '#c5aa88', 'warm natural beige textile', 4),
    ('color', 'brown', 'Nâu', '#604a3e', 'deep earthy brown', 5),
    ('color', 'moss', 'Xanh rêu', '#596653', 'muted moss green', 6),
    ('color', 'deep-red', 'Đỏ trầm', '#713b36', 'restrained deep red', 7),
    ('color', 'white', 'Trắng', '#f4f0e7', 'soft textile white', 8),
    ('color', 'black', 'Đen', '#242728', 'soft black textile', 9),
    ('style', 'minimal', 'Tối giản', 'minimal', 'clean silhouette and one modern accent', 4),
    ('style', 'school-polished', 'Học đường', 'school polished', 'youthful, neat and practical', 5),
    ('style', 'elegant', 'Thanh lịch', 'elegant', 'refined styling with restrained accessories', 6),
    ('style', 'streetwear', 'Streetwear', 'streetwear', 'urban styling without hiding garment structure', 7),
    ('style', 'vintage', 'Vintage', 'vintage', 'period-inspired editorial styling', 8),
    ('style', 'active', 'Năng động', 'active', 'comfortable movement and lightweight accessories', 9),
    ('pattern', 'plain', 'Trơn', 'plain', 'solid textile with visible weave', 1),
    ('pattern', 'cloud', 'Vân mây', 'cloud', 'restrained traditional cloud motif', 2),
    ('pattern', 'lotus', 'Hoa sen', 'lotus', 'small-scale lotus motif', 3),
    ('scene', 'campus', 'Trường học', 'campus', 'Vietnamese university campus', 1),
    ('scene', 'old-quarter', 'Phố cổ', 'old quarter', 'Hanoi old quarter streetscape', 2),
    ('scene', 'temple', 'Văn Miếu', 'temple', 'Temple of Literature courtyard', 3),
    ('scene', 'citadel', 'Hoàng thành', 'citadel', 'Imperial Citadel of Thang Long', 4),
    ('scene', 'studio', 'Studio', 'studio', 'editorial daylight studio', 5),
    ('scene', 'ceremonial-space', 'Không gian lễ nghi', 'ceremonial space', 'respectful Vietnamese ceremonial setting', 6)
on conflict (option_type, slug) do update set
    label = excluded.label,
    value = excluded.value,
    prompt_hint = excluded.prompt_hint,
    sort_order = excluded.sort_order,
    is_active = true;

create table if not exists public.cultural_rules (
    id uuid primary key default gen_random_uuid(),
    garment_id uuid references public.studio_garments(id) on delete cascade,
    rule_text text not null,
    severity text not null default 'warning' check (severity in ('info', 'warning', 'blocking')),
    context text not null default 'all',
    review_status text not null default 'draft' check (review_status in ('draft', 'review', 'approved')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.user_context_sessions (
    id uuid primary key default gen_random_uuid(),
    session_token_hash text not null unique,
    branch_key text,
    occasion_slug text,
    context jsonb not null default '{}'::jsonb,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists public.looks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    session_id uuid references public.user_context_sessions(id) on delete set null,
    name text not null default 'Look chưa đặt tên',
    occasion_slug text,
    garment_slug text,
    color_slug text,
    pattern_slug text,
    style_slug text,
    scene_slug text,
    selection jsonb not null default '{}'::jsonb,
    locks jsonb not null default '{}'::jsonb,
    image_url text,
    base_look_id uuid references public.looks(id) on delete set null,
    prompt_version_id uuid references public.studio_prompt_versions(id) on delete set null,
    generation_job_id uuid references public.generation_jobs(id) on delete set null,
    visibility text not null default 'private' check (visibility in ('private', 'public')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.look_variants (
    id uuid primary key default gen_random_uuid(),
    look_id uuid not null references public.looks(id) on delete cascade,
    variant_index smallint not null default 1,
    label text not null default '',
    selection jsonb not null default '{}'::jsonb,
    image_url text,
    cultural_score numeric(5, 2),
    prompt_version_id uuid references public.studio_prompt_versions(id) on delete set null,
    generation_job_id uuid references public.generation_jobs(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (look_id, variant_index)
);

create table if not exists public.look_accessories (
    look_id uuid not null references public.looks(id) on delete cascade,
    accessory_id uuid not null references public.studio_accessories(id) on delete cascade,
    accessory_name text not null default '',
    primary key (look_id, accessory_id)
);

create table if not exists public.discovery_looks (
    id uuid primary key default gen_random_uuid(),
    look_id uuid not null unique references public.looks(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'featured', 'archived')),
    moderation_note text not null default '',
    reviewed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists cultural_rules_garment_idx on public.cultural_rules (garment_id, review_status);
create index if not exists looks_session_created_idx on public.looks (session_id, created_at desc);
create index if not exists looks_user_created_idx on public.looks (user_id, created_at desc);
create index if not exists look_variants_look_idx on public.look_variants (look_id, variant_index);
create index if not exists discovery_looks_status_idx on public.discovery_looks (status, created_at desc);

alter table public.cultural_rules enable row level security;
alter table public.user_context_sessions enable row level security;
alter table public.looks enable row level security;
alter table public.look_variants enable row level security;
alter table public.look_accessories enable row level security;
alter table public.discovery_looks enable row level security;

drop policy if exists "public can read approved cultural rules" on public.cultural_rules;
create policy "public can read approved cultural rules"
    on public.cultural_rules for select
    using (is_active = true and review_status = 'approved');

drop policy if exists "public can read approved discovery looks" on public.discovery_looks;
create policy "public can read approved discovery looks"
    on public.discovery_looks for select
    using (status in ('approved', 'featured'));

insert into public.cultural_rules (garment_id, rule_text, severity, context, review_status)
select id, 'Không để phụ kiện che hàng khuy chính hoặc làm mất cấu trúc năm thân.', 'warning', 'all', 'approved'
from public.studio_garments
where slug = 'ao-ngu-than-tay-chen'
  and not exists (
      select 1 from public.cultural_rules
      where garment_id = public.studio_garments.id
        and rule_text = 'Không để phụ kiện che hàng khuy chính hoặc làm mất cấu trúc năm thân.'
  );

insert into public.cultural_rules (garment_id, rule_text, severity, context, review_status)
select id, 'Khi vào nơi thờ tự hoặc dự lễ, ưu tiên mặc chỉnh tề và dùng phụ kiện tiết chế.', 'warning', 'temple', 'approved'
from public.studio_garments
where slug in ('ao-tac', 'ao-nhat-binh')
  and not exists (
      select 1 from public.cultural_rules
      where garment_id = public.studio_garments.id
        and context = 'temple'
  );
