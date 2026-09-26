-- V-Remix Studio catalog and generation contract.
create table if not exists public.cultural_sources (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    source_url text,
    license text,
    curator_note text,
    review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'published')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.studio_events (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    label text not null,
    description text not null,
    cultural_context text not null default '',
    sort_order smallint not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.studio_garments (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    category text not null,
    description text not null,
    origin_note text not null default '',
    significance_note text not null default '',
    image_url text,
    source_id uuid references public.cultural_sources(id) on delete set null,
    sort_order smallint not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.studio_accessories (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    category text not null,
    description text not null default '',
    image_url text,
    sort_order smallint not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.studio_options (
    id uuid primary key default gen_random_uuid(),
    option_type text not null check (option_type in ('color', 'style')),
    slug text not null,
    label text not null,
    value text not null default '',
    prompt_hint text not null default '',
    sort_order smallint not null default 0,
    is_active boolean not null default true,
    unique (option_type, slug)
);

create table if not exists public.studio_prompt_versions (
    id uuid primary key default gen_random_uuid(),
    slug text not null,
    version integer not null default 1,
    model text not null default 'gemini',
    system_prompt text not null,
    eval_notes text not null default '',
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    unique (slug, version)
);

create unique index if not exists studio_one_active_prompt_idx
    on public.studio_prompt_versions (slug) where is_active = true;

create table if not exists public.generation_jobs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    input jsonb not null default '{}'::jsonb,
    output jsonb not null default '{}'::jsonb,
    prompt_version_id uuid references public.studio_prompt_versions(id) on delete set null,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

create index if not exists studio_events_order_idx on public.studio_events (sort_order);
create index if not exists studio_garments_order_idx on public.studio_garments (sort_order);
create index if not exists studio_accessories_order_idx on public.studio_accessories (sort_order);
create index if not exists generation_jobs_user_created_idx on public.generation_jobs (user_id, created_at desc);

alter table public.cultural_sources enable row level security;
alter table public.studio_events enable row level security;
alter table public.studio_garments enable row level security;
alter table public.studio_accessories enable row level security;
alter table public.studio_options enable row level security;
alter table public.studio_prompt_versions enable row level security;
alter table public.generation_jobs enable row level security;

drop policy if exists "public can read published cultural sources" on public.cultural_sources;
create policy "public can read published cultural sources" on public.cultural_sources for select
    using (review_status = 'published');
drop policy if exists "public can read active studio events" on public.studio_events;
create policy "public can read active studio events" on public.studio_events for select
    using (is_active = true);
drop policy if exists "public can read active studio garments" on public.studio_garments;
create policy "public can read active studio garments" on public.studio_garments for select
    using (is_active = true);
drop policy if exists "public can read active studio accessories" on public.studio_accessories;
create policy "public can read active studio accessories" on public.studio_accessories for select
    using (is_active = true);
drop policy if exists "public can read active studio options" on public.studio_options;
create policy "public can read active studio options" on public.studio_options for select
    using (is_active = true);
drop policy if exists "public can read active studio prompts" on public.studio_prompt_versions;
create policy "public can read active studio prompts" on public.studio_prompt_versions for select
    using (is_active = true);
drop policy if exists "users can read own generation jobs" on public.generation_jobs;
create policy "users can read own generation jobs" on public.generation_jobs for select
    using (auth.uid() = user_id);

insert into public.studio_events (slug, label, description, cultural_context, sort_order)
values
    ('school', 'Đi học', 'Gọn gàng, linh hoạt và gần gũi cho nhịp sống học đường.', 'Ưu tiên sự thoải mái, kín đáo và dễ vận động.', 1),
    ('street', 'Dạo phố', 'Cân bằng chất liệu truyền thống với nhịp sống đô thị.', 'Có thể phối cùng phụ kiện hiện đại nhưng giữ phom nhận diện.', 2),
    ('ceremony', 'Dự lễ', 'Trang trọng, tiết chế và phù hợp không gian nghi lễ.', 'Tôn trọng quy tắc cài cúc, vạt áo và hoàn cảnh sử dụng.', 3),
    ('portrait', 'Chụp ảnh', 'Tạo hình có điểm nhấn cho bộ ảnh và lookbook cá nhân.', 'Ưu tiên bố cục, ánh sáng và chi tiết thủ công.', 4)
on conflict (slug) do update set
    label = excluded.label, description = excluded.description,
    cultural_context = excluded.cultural_context, sort_order = excluded.sort_order,
    is_active = true, updated_at = now();

insert into public.studio_garments (slug, name, category, description, origin_note, significance_note, sort_order)
values
    ('ao-ngu-than-tay-chen', 'Áo ngũ thân tay chẽn', 'Áo ngũ thân', 'Phom áo năm thân với tay chẽn gọn, phù hợp cách phối đương đại.', 'Dòng áo cổ truyền gắn với hệ trang phục Việt qua nhiều thời kỳ.', 'Năm thân áo thường được diễn giải như các lớp quan hệ và đạo lý trong văn hóa Việt.', 1),
    ('ao-tac', 'Áo tấc', 'Áo ngũ thân', 'Dáng áo trang trọng, tay rộng và phù hợp bối cảnh lễ nghi.', 'Một biến thể trang phục lễ phục truyền thống.', 'Cần giữ tỷ lệ, cổ áo và cách cài đúng khi mô tả.', 2),
    ('ao-nhat-binh', 'Áo Nhật Bình', 'Áo cung đình', 'Áo có mảng cổ đặc trưng, tạo hình rõ nét cho ảnh chân dung.', 'Gắn với phục sức cung đình triều Nguyễn.', 'Không giản lược các chi tiết nhận diện thành họa tiết trang trí chung chung.', 3),
    ('ao-tu-than', 'Áo tứ thân', 'Áo Bắc Bộ', 'Lớp áo mềm, tạo chuyển động tốt khi phối cùng phụ kiện hiện đại.', 'Gắn với hình ảnh phụ nữ vùng đồng bằng Bắc Bộ.', 'Nên giữ mối liên hệ giữa áo, yếm, thắt lưng và hoàn cảnh mặc.', 4)
on conflict (slug) do update set
    name = excluded.name, category = excluded.category, description = excluded.description,
    origin_note = excluded.origin_note, significance_note = excluded.significance_note,
    sort_order = excluded.sort_order, is_active = true, updated_at = now();

insert into public.studio_accessories (slug, name, category, description, sort_order)
values
    ('sneaker-trang', 'Sneaker trắng', 'Giày', 'Tạo nhịp trẻ và dễ vận động cho phối đồ hằng ngày.', 1),
    ('giay-loafer', 'Giày loafer', 'Giày', 'Giữ cảm giác gọn gàng, lịch sự nhưng không quá nghi lễ.', 2),
    ('tui-tote', 'Túi tote', 'Túi', 'Tăng tính thực dụng cho bối cảnh học đường và đô thị.', 3),
    ('kinh-ram', 'Kính râm', 'Phụ kiện', 'Tạo điểm nhấn thời trang cho bộ ảnh ngoài trời.', 4),
    ('dong-ho-thong-minh', 'Đồng hồ thông minh', 'Phụ kiện', 'Một chi tiết công nghệ tiết chế trong tổng thể truyền thống.', 5)
on conflict (slug) do update set
    name = excluded.name, category = excluded.category, description = excluded.description,
    sort_order = excluded.sort_order, is_active = true;

insert into public.studio_options (option_type, slug, label, value, prompt_hint, sort_order)
values
    ('color', 'indigo', 'Chàm lam', '#243652', 'deep indigo blue with restrained contrast', 1),
    ('color', 'ivory', 'Ngà ấm', '#e8ddc9', 'warm ivory with natural textile texture', 2),
    ('color', 'vermilion', 'Đỏ son', '#9e3f36', 'muted vermilion accent, never neon', 3),
    ('style', 'quiet-modern', 'Tối giản hiện đại', 'quiet modern', 'clean silhouette, restrained accessories', 1),
    ('style', 'heritage-editorial', 'Biên tập di sản', 'heritage editorial', 'editorial composition, visible craft details', 2),
    ('style', 'street-soft', 'Đô thị mềm', 'soft street', 'Gen Z street styling without erasing garment identity', 3)
on conflict (option_type, slug) do update set
    label = excluded.label, value = excluded.value, prompt_hint = excluded.prompt_hint,
    sort_order = excluded.sort_order, is_active = true;

insert into public.studio_prompt_versions (slug, version, model, system_prompt, eval_notes, is_active)
values (
    'outfit-image',
    1,
    'gemini',
    'Create a respectful Vietnamese traditional outfit styling concept. Preserve the garment silhouette, collar, buttons, panels, sleeves and cultural identity. Modernize only the requested accessories and styling. Do not invent historical claims. Return structured output with image_prompt, cultural_notes, guardrails and confidence.',
    'Initial audition prompt. Must be evaluated against garment identity, event fit, accessory compatibility and cultural safety.',
    true
)
on conflict (slug, version) do update set
    system_prompt = excluded.system_prompt, eval_notes = excluded.eval_notes,
    is_active = true;
