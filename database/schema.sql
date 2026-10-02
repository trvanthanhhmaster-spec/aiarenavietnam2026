-- V-Remix content model for Supabase.
create table if not exists public.pages (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    brand_mark text not null,
    brand_name text not null,
    title text not null,
    description text not null,
    hero_line_one text not null,
    hero_line_two text not null,
    hero_description_one text not null,
    hero_description_two text not null,
    controller_label text not null,
    cta_label text not null,
    ui jsonb not null default '{}'::jsonb,
    media_url text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.experience_branches (
    id uuid primary key default gen_random_uuid(),
    page_slug text not null references public.pages(slug) on update cascade on delete cascade,
    branch_key text not null,
    label text not null,
    forward_guard numeric(4, 2) not null default 0.08,
    reverse_guard numeric(4, 2) not null default 0.08,
    forward_media_url text not null,
    reverse_media_url text,
    is_base boolean not null default false,
    sort_order smallint not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (page_slug, branch_key)
);

create index if not exists experience_branches_page_order_idx
    on public.experience_branches (page_slug, sort_order);

create unique index if not exists one_base_branch_per_page_idx
    on public.experience_branches (page_slug)
    where is_base = true;

alter table public.pages enable row level security;
alter table public.experience_branches enable row level security;

drop policy if exists "public can read pages" on public.pages;
create policy "public can read pages"
    on public.pages for select
    using (true);

drop policy if exists "public can read active branches" on public.experience_branches;
create policy "public can read active branches"
    on public.experience_branches for select
    using (is_active = true);

insert into public.pages (
    slug, name, brand_mark, brand_name, title, description,
    hero_line_one, hero_line_two, hero_description_one, hero_description_two,
    controller_label, cta_label, ui, media_url
) values (
    'home',
    'V-Remix',
    'V',
    'Remix',
    'V-Remix — Việt phục, theo cách bạn',
    'Khám phá cách mặc Việt phục khi đi học, dạo phố, dự lễ hoặc chụp ảnh. Gần gũi hơn với trang phục Việt, tự tin hơn với phong cách của bạn.',
    'Việt phục,',
    'theo cách bạn.',
    'Đi học, xuống phố hay dự lễ?',
    'Khám phá cách phối đồ Việt vừa hợp dịp, vừa là bạn.',
    'Bạn mặc đi đâu?',
    'Khám phá ngay',
    jsonb_build_object(
        'controller_aria_label', 'Chọn dịp mặc để xem minh hoạ',
        'brand_aria_label', 'Trang chủ V-Remix',
        'retry_label', 'Thử lại',
        'reset_label', 'Chọn lại',
        'return_aria_label', 'Trở về để chọn dịp mặc khác',
        'status_loading', 'Đang tải các hiệu ứng chuyển cảnh.',
        'status_ready', 'Mọi hiệu ứng chuyển cảnh đã sẵn sàng.',
        'status_prepare', 'Hình ảnh đang được chuẩn bị. Bạn chờ một chút nhé.',
        'status_opening', 'Đang mở bản xem thử cho lựa chọn {label}.',
        'status_selected', 'Đã chọn {label}. Đây là video minh hoạ. Nhấn Chọn lại để xem lựa chọn khác.',
        'status_returning', 'Đang trở về khung cảnh ban đầu.',
        'status_returned', 'Đã trở về khung cảnh ban đầu.',
        'error_video_load', 'Không tải được video. Vui lòng thử lại.',
        'error_video_blocked', 'Trình duyệt đã chặn phát video.',
        'error_video_timeout', 'Video {label} tải quá lâu. Vui lòng thử lại.',
        'error_video_playback', 'Không phát được video {label}.'
    ),
    'https://pub-17538b171cce44888cd5fc146559c986.r2.dev/folder01/Create_continuous_five-second_tr%E2%80%A6_1080p_20260926121852.mp4'
)
on conflict (slug) do update set
    name = excluded.name,
    brand_mark = excluded.brand_mark,
    brand_name = excluded.brand_name,
    title = excluded.title,
    description = excluded.description,
    hero_line_one = excluded.hero_line_one,
    hero_line_two = excluded.hero_line_two,
    hero_description_one = excluded.hero_description_one,
    hero_description_two = excluded.hero_description_two,
    controller_label = excluded.controller_label,
    cta_label = excluded.cta_label,
    ui = excluded.ui,
    media_url = excluded.media_url,
    updated_at = now();

insert into public.experience_branches (
    page_slug, branch_key, label, forward_guard, reverse_guard,
    forward_media_url, reverse_media_url, is_base, sort_order
)
values
    ('home', 'dihoc', 'Đi học', 0.08, 0.18, 'https://pub-17538b171cce44888cd5fc146559c986.r2.dev/folder01/Create_continuous_five-second_tr%E2%80%A6_1080p_20260926121852.mp4', null, false, 1),
    ('home', 'daopho', 'Dạo phố', 0.08, 0.08, 'https://pub-17538b171cce44888cd5fc146559c986.r2.dev/folder01/Create_continuous_five-second_tr%E2%80%A6_1080p_20260926121852.mp4', null, false, 2),
    ('home', 'dule', 'Dự lễ', 0.08, 0.08, 'https://pub-17538b171cce44888cd5fc146559c986.r2.dev/folder01/Create_continuous_five-second_tr%E2%80%A6_1080p_20260926121852.mp4', null, true, 3),
    ('home', 'chupanh', 'Chụp ảnh', 0.08, 0.08, 'https://pub-17538b171cce44888cd5fc146559c986.r2.dev/folder01/Create_continuous_five-second_tr%E2%80%A6_1080p_20260926121852.mp4', null, false, 4)
on conflict (page_slug, branch_key) do update set
    label = excluded.label,
    forward_guard = excluded.forward_guard,
    reverse_guard = excluded.reverse_guard,
    forward_media_url = excluded.forward_media_url,
    reverse_media_url = excluded.reverse_media_url,
    is_base = excluded.is_base,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

-- Studio catalog, cultural review metadata and generation contract.
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
    client_request_id uuid,
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

create table if not exists public.ai_runtime_settings (
    id smallint primary key default 1 check (id = 1),
    generation_enabled boolean not null default true,
    image_provider text not null default 'env' check (image_provider in ('env', 'gemini', 'vertex', 'webapi')),
    video_provider text not null default 'env' check (video_provider in ('env', 'gemini', 'vertex')),
    text_model text not null default 'gemini-2.5-flash',
    image_model text not null default 'gemini-2.5-flash-image',
    video_model text not null default 'veo-3.1-fast-generate-001',
    image_variants smallint not null default 5 check (image_variants between 1 and 5),
    image_unit_cost_vnd numeric(14, 2) not null default 0 check (image_unit_cost_vnd >= 0),
    video_unit_cost_vnd numeric(14, 2) not null default 0 check (video_unit_cost_vnd >= 0),
    daily_budget_vnd numeric(14, 2) not null default 0 check (daily_budget_vnd >= 0),
    monthly_budget_vnd numeric(14, 2) not null default 0 check (monthly_budget_vnd >= 0),
    encrypted_gemini_api_key text,
    gemini_api_key_hint text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.studio_generation_settings (
    id smallint primary key default 1 check (id = 1),
    canvas_aspect_ratio text not null default '16:9' check (canvas_aspect_ratio in ('16:9', '1:1', '9:16')),
    target_resolution text not null default '1080' check (target_resolution in ('720', '1080', '2160')),
    default_generation_mode text not null default 'text-to-image' check (default_generation_mode in ('text-to-image', 'image-to-image')),
    base_prompt text not null default 'Ảnh gốc A: một nhân vật Việt mặc trang phục được chọn, đứng chính giữa, toàn thân, góc máy và bố cục ổn định.',
    frame_plan jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.generation_jobs
    add column if not exists estimated_cost_vnd numeric(14, 2) not null default 0,
    add column if not exists image_count smallint not null default 0,
    add column if not exists video_count smallint not null default 0;

create unique index if not exists generation_jobs_client_request_idx
    on public.generation_jobs (client_request_id);
create index if not exists studio_events_order_idx on public.studio_events (sort_order);
create index if not exists studio_garments_order_idx on public.studio_garments (sort_order);
create index if not exists studio_accessories_order_idx on public.studio_accessories (sort_order);
create index if not exists generation_jobs_user_created_idx on public.generation_jobs (user_id, created_at desc);
create index if not exists generation_jobs_cost_created_idx on public.generation_jobs (created_at desc, status);

alter table public.cultural_sources enable row level security;
alter table public.studio_events enable row level security;
alter table public.studio_garments enable row level security;
alter table public.studio_accessories enable row level security;
alter table public.studio_options enable row level security;
alter table public.studio_prompt_versions enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.ai_runtime_settings enable row level security;
alter table public.studio_generation_settings enable row level security;
revoke all on public.ai_runtime_settings from anon, authenticated;
drop policy if exists "public can read studio generation settings" on public.studio_generation_settings;
create policy "public can read studio generation settings"
    on public.studio_generation_settings for select
    using (true);

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
    'Create a respectful Vietnamese traditional outfit styling concept. Preserve the garment silhouette, collar, buttons, panels, sleeves and cultural identity. Modernize only the requested accessories and styling. Do not invent historical claims. Return JSON with exactly these keys: story, guardrail, genZTip, imagePrompt and confidence. confidence must be a number between 0 and 1.',
    'Validate story, guardrail, genZTip, imagePrompt and confidence against the Studio output schema before creating assets.',
    true
)
on conflict (slug, version) do update set
    system_prompt = excluded.system_prompt, eval_notes = excluded.eval_notes,
    is_active = true;

insert into public.ai_runtime_settings (
    id, generation_enabled, image_provider, video_provider,
    text_model, image_model, video_model, image_variants
) values (
    1, true, 'env', 'env',
    'gemini-2.5-flash', 'gemini-2.5-flash-image',
    'veo-3.1-fast-generate-001', 4
)
on conflict (id) do nothing;

insert into public.studio_generation_settings (
    id, canvas_aspect_ratio, target_resolution, default_generation_mode, base_prompt, frame_plan
) values (
    1,
    '16:9',
    '1080',
    'text-to-image',
    'Ảnh gốc A: một nhân vật Việt mặc trang phục được chọn, đứng chính giữa, toàn thân, góc máy và bố cục ổn định.',
    jsonb_build_array(
        jsonb_build_object('key', 'A', 'label', 'Ảnh gốc', 'branch_key', 'base', 'change_scope', 'Cố định nhân vật, khuôn mặt, dáng đứng, góc máy và bố cục.', 'prompt_template', 'Create the locked source frame A. Preserve the subject identity, face, pose, camera angle and composition.'),
        jsonb_build_object('key', 'B', 'label', 'Bối cảnh', 'branch_key', 'event', 'change_scope', 'Chỉ thay phông nền và bối cảnh; giữ nhân vật, trang phục, vị trí và kích thước.', 'prompt_template', 'Change only the background and scene. Keep the subject, garment, camera, position and scale identical to frame A.'),
        jsonb_build_object('key', 'C', 'label', 'Ánh sáng', 'branch_key', 'lighting', 'change_scope', 'Chỉ thay ánh sáng và thời điểm trong ngày; giữ phông nền, nhân vật và trang phục.', 'prompt_template', 'Change only the lighting and time of day. Keep the background, subject, garment, camera, position and scale identical to frame A.'),
        jsonb_build_object('key', 'D', 'label', 'Trang phục', 'branch_key', 'garment', 'change_scope', 'Chỉ thay quần áo; giữ nhân vật, khuôn mặt, dáng đứng, góc máy và bố cục.', 'prompt_template', 'Change only the clothing and garment styling. Keep the subject identity, face, pose, camera and composition identical to frame A.'),
        jsonb_build_object('key', 'E', 'label', 'Nhân vật', 'branch_key', 'character', 'change_scope', 'Chỉ thay nhân vật; giữ vị trí, kích thước, góc máy và bố cục tương đương.', 'prompt_template', 'Change only the subject identity. Keep the framing, position, scale, camera angle, background and garment composition equivalent to frame A.')
    )
)
on conflict (id) do nothing;

-- Three-layer workflow. Keep this section aligned with
-- supabase/migrations/20261002090000_add_three_layer_workflow.sql.
alter table public.experience_branches
    add column if not exists studio_event_slug text references public.studio_events(slug) on delete set null,
    add column if not exists thumbnail_url text;

alter table public.studio_events
    add column if not exists preset jsonb not null default '{}'::jsonb;

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

alter table public.studio_options drop constraint if exists studio_options_option_type_check;
alter table public.studio_options add constraint studio_options_option_type_check
    check (option_type in ('color', 'style', 'pattern', 'scene'));

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

update public.experience_branches
set studio_event_slug = case branch_key
    when 'dihoc' then 'school'
    when 'daopho' then 'street'
    when 'dule' then 'ceremony'
    when 'chupanh' then 'portrait'
    else studio_event_slug
end
where studio_event_slug is null;

update public.studio_events
set preset = case slug
    when 'school' then '{"location":"Hà Nội","season":"Mùa thu","garment":"ao-ngu-than-tay-chen","color":"indigo","style":"school-polished","scene":"campus"}'::jsonb
    when 'street' then '{"location":"Phố cổ Hà Nội","season":"Mùa thu","garment":"ao-tu-than","color":"moss","style":"streetwear","scene":"old-quarter"}'::jsonb
    when 'ceremony' then '{"location":"Văn Miếu","season":"Mùa thu","garment":"ao-tac","color":"vermilion","style":"elegant","scene":"temple"}'::jsonb
    when 'portrait' then '{"location":"Studio","season":"Bốn mùa","garment":"ao-nhat-binh","color":"ivory","style":"heritage-editorial","scene":"studio"}'::jsonb
    else preset
end;

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
    label = excluded.label, value = excluded.value, prompt_hint = excluded.prompt_hint,
    sort_order = excluded.sort_order, is_active = true;

insert into public.cultural_rules (garment_id, rule_text, severity, context, review_status)
select id, 'Không để phụ kiện che hàng khuy chính hoặc làm mất cấu trúc năm thân.', 'warning', 'all', 'approved'
from public.studio_garments
where slug = 'ao-ngu-than-tay-chen'
  and not exists (
      select 1 from public.cultural_rules
      where garment_id = public.studio_garments.id
        and rule_text = 'Không để phụ kiện che hàng khuy chính hoặc làm mất cấu trúc năm thân.'
  );
