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
    default_output_type text not null default 'image' check (default_output_type in ('image', 'video', 'both')),
    preview_media_url text not null default '',
    preview_poster_url text not null default '',
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
    ('school', 'Đi học', 'Gợi ý nhanh cho lớp học, campus và nhịp đi học hằng ngày.', 'Ưu tiên kín đáo, thoải mái, dễ vận động; phụ kiện hiện đại chỉ làm điểm nhấn.', 1),
    ('street', 'Dạo phố', 'Bản phối Việt phục nhẹ nhõm cho phố cổ, cà phê và dạo phố.', 'Giữ phom và chi tiết nhận diện; không để phụ kiện đô thị che cấu trúc áo.', 2),
    ('ceremony', 'Dự lễ', 'Bản phối trang trọng cho lễ tốt nghiệp, cưới hỏi và không gian di sản.', 'Tôn trọng quy cách cài cúc, vạt áo, độ kín đáo và quy định nơi tổ chức.', 3),
    ('portrait', 'Chụp ảnh', 'Bản phối có chủ đích cho kỷ yếu, lookbook và bộ ảnh cá nhân.', 'Giữ bố cục và nhân vật ổn định để so sánh các phương án lookbook.', 4)
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
    'Create a respectful Vietnamese traditional outfit styling concept for Gen Z. Preserve the garment silhouette, collar, buttons, panels, sleeves and cultural identity. Modernize only the requested accessories and styling. Use the approved catalog facts as the source of truth; do not invent historical claims. Return JSON with exactly these keys: story, guardrail, genZTip, culturalScore, imagePrompt and confidence. culturalScore must be a number from 0 to 100 and reflect cultural fit, not image quality. confidence must be a number between 0 and 1.',
    'Validate story, guardrail, genZTip, imagePrompt, culturalScore and confidence. Check context, weather and event fit; warnings must be actionable and respectful.',
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
    id, canvas_aspect_ratio, target_resolution, default_generation_mode, default_output_type, base_prompt, frame_plan
) values (
    1,
    '16:9',
    '1080',
    'text-to-image',
    'image',
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

create index if not exists cultural_rules_garment_idx on public.cultural_rules (garment_id, review_status);
create index if not exists looks_session_created_idx on public.looks (session_id, created_at desc);
create index if not exists looks_user_created_idx on public.looks (user_id, created_at desc);
create index if not exists look_variants_look_idx on public.look_variants (look_id, variant_index);
create index if not exists discovery_looks_status_idx on public.discovery_looks (status, created_at desc);
create index if not exists studio_marketplace_garment_idx on public.studio_marketplace_listings (garment_id, is_active, sort_order);
create index if not exists studio_marketplace_accessory_idx on public.studio_marketplace_listings (accessory_id, is_active, sort_order);
create index if not exists studio_locations_context_idx on public.studio_locations using gin (suitable_contexts);

alter table public.studio_marketplace_listings enable row level security;
alter table public.studio_locations enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
drop policy if exists "public can read active marketplace listings" on public.studio_marketplace_listings;
create policy "public can read active marketplace listings"
    on public.studio_marketplace_listings for select using (is_active = true);
drop policy if exists "public can read active studio locations" on public.studio_locations;
create policy "public can read active studio locations"
    on public.studio_locations for select using (is_active = true);
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
    on public.profiles for select using (auth.uid() = id);
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
    on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "users can read own roles" on public.user_roles;
create policy "users can read own roles"
    on public.user_roles for select using (auth.uid() = user_id);
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant all on public.profiles to service_role;
grant all on public.user_roles to service_role;

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

insert into public.studio_locations
    (slug, name, address, province, latitude, longitude, map_url, description, suitable_contexts, source_url, sort_order)
values
    ('van-mieu-quoc-tu-giam', 'Văn Miếu – Quốc Tử Giám', '58 Quốc Tử Giám, Đống Đa', 'Hà Nội', 21.0242336, 105.8410067,
     'https://www.google.com/maps/search/?api=1&query=V%C4%83n+Mi%E1%BA%BFu+Qu%E1%BB%91c+T%E1%BB%AD+Gi%C3%A1m+H%C3%A0+N%E1%BB%99i',
     'Không gian di sản phù hợp ảnh chân dung và bản phối dự lễ. Kiểm tra quy định chụp ảnh trước khi đến.',
     '["ceremony","portrait"]'::jsonb, 'https://www.openstreetmap.org/node/10591743723', 1),
    ('hoang-thanh-thang-long', 'Hoàng thành Thăng Long', '19C Hoàng Diệu, Ba Đình', 'Hà Nội', 21.0362620, 105.8402826,
     'https://www.google.com/maps/search/?api=1&query=Ho%C3%A0ng+th%C3%A0nh+Th%C4%83ng+Long+H%C3%A0+N%E1%BB%99i',
     'Bối cảnh thành cổ có nhịp kiến trúc rõ, hợp ảnh editorial và trang phục lễ.',
     '["ceremony","portrait","street"]'::jsonb, 'https://www.openstreetmap.org/relation/21425205', 2),
    ('pho-co-ha-noi', 'Phố cổ Hà Nội', 'Khu phố cổ, Hoàn Kiếm', 'Hà Nội', 21.0340, 105.8500,
     'https://www.google.com/maps/search/?api=1&query=Ph%E1%BB%91+c%E1%BB%95+H%C3%A0+N%E1%BB%99i',
     'Nhịp phố đời thường cho bản phối dạo phố; ưu tiên góc chụp không cản trở lối đi.',
     '["street","portrait"]'::jsonb, 'https://www.openstreetmap.org/search?query=Old%20Quarter%20Hanoi', 3)
on conflict (slug) do update set
    name = excluded.name, address = excluded.address, province = excluded.province,
    latitude = excluded.latitude, longitude = excluded.longitude, map_url = excluded.map_url,
    description = excluded.description, suitable_contexts = excluded.suitable_contexts,
    source_url = excluded.source_url, sort_order = excluded.sort_order,
    is_active = true, updated_at = now();

insert into public.studio_marketplace_listings (
    item_type, garment_id, provider_name, listing_type, title,
    address, province, external_url, source_url, verified_at, sort_order
)
select 'garment', garment.id, 'V''style – Việt Cổ Phục', 'both',
       'Xem danh mục ' || garment.name, 'SN 3B, ngõ 94 Hoàng Ngân, Cầu Giấy', 'Hà Nội',
       'https://vietphuc.net/trang-phuc-cho-thue', 'https://vietphuc.net/', now(), 1
from public.studio_garments as garment
where not exists (
    select 1 from public.studio_marketplace_listings as listing
    where listing.garment_id = garment.id and listing.provider_name = 'V''style – Việt Cổ Phục'
);

insert into public.studio_marketplace_listings (
    item_type, garment_id, provider_name, listing_type, title,
    province, external_url, source_url, verified_at, sort_order
)
select 'garment', garment.id, 'Tô Hà Style', 'both',
       'Tham khảo ' || garment.name, 'Hà Nội',
       'https://tohastyle.com.vn/', 'https://tohastyle.com.vn/', now(), 2
from public.studio_garments as garment
where not exists (
    select 1 from public.studio_marketplace_listings as listing
    where listing.garment_id = garment.id and listing.provider_name = 'Tô Hà Style'
);

insert into public.studio_marketplace_listings (
    item_type, garment_id, provider_name, listing_type, title,
    address, province, external_url, source_url, verified_at, sort_order
)
select 'garment', garment.id, 'Việt Phục Hoàng Thành', 'rent',
       'Thuê ' || garment.name, 'Khu di tích Hoàng thành Thăng Long', 'Hà Nội',
       'https://vietphuchoangthanh.com/', 'https://vietphuchoangthanh.com/', now(), 3
from public.studio_garments as garment
where not exists (
    select 1 from public.studio_marketplace_listings as listing
    where listing.garment_id = garment.id and listing.provider_name = 'Việt Phục Hoàng Thành'
);

insert into public.cultural_rules (garment_id, rule_text, severity, context, review_status)
select id, 'Không để phụ kiện che hàng khuy chính hoặc làm mất cấu trúc năm thân.', 'warning', 'all', 'approved'
from public.studio_garments
where slug = 'ao-ngu-than-tay-chen'
  and not exists (
      select 1 from public.cultural_rules
      where garment_id = public.studio_garments.id
        and rule_text = 'Không để phụ kiện che hàng khuy chính hoặc làm mất cấu trúc năm thân.'
  );

-- Licensed visual references for the Studio catalog. Keep this block aligned
-- with 20261004030000_add_real_catalog_media.sql.
alter table public.studio_options
    add column if not exists description text not null default '',
    add column if not exists thumbnail_url text,
    add column if not exists source_url text;

update public.studio_garments
set thumbnail_url = case slug
        when 'ao-ngu-than-tay-chen' then 'assets/media/catalog/garment-ao-ngu-than.webp'
        when 'ao-tac' then 'assets/media/catalog/garment-ao-tac.webp'
        when 'ao-nhat-binh' then 'assets/media/catalog/garment-ao-nhat-binh.webp'
        when 'ao-tu-than' then 'assets/media/catalog/garment-ao-tu-than.webp'
        else thumbnail_url
    end,
    image_url = case slug
        when 'ao-ngu-than-tay-chen' then 'assets/media/catalog/garment-ao-ngu-than.webp'
        when 'ao-tac' then 'assets/media/catalog/garment-ao-tac.webp'
        when 'ao-nhat-binh' then 'assets/media/catalog/garment-ao-nhat-binh.webp'
        when 'ao-tu-than' then 'assets/media/catalog/garment-ao-tu-than.webp'
        else image_url
    end;

update public.studio_accessories
set thumbnail_url = case slug
        when 'sneaker-trang' then 'assets/media/catalog/accessory-sneaker-trang.webp'
        when 'giay-loafer' then 'assets/media/catalog/accessory-giay-loafer.webp'
        when 'tui-tote' then 'assets/media/catalog/accessory-tui-tote.webp'
        when 'kinh-ram' then 'assets/media/catalog/accessory-kinh-ram.webp'
        when 'dong-ho-thong-minh' then 'assets/media/catalog/accessory-dong-ho.webp'
        else thumbnail_url
    end,
    image_url = case slug
        when 'sneaker-trang' then 'assets/media/catalog/accessory-sneaker-trang.webp'
        when 'giay-loafer' then 'assets/media/catalog/accessory-giay-loafer.webp'
        when 'tui-tote' then 'assets/media/catalog/accessory-tui-tote.webp'
        when 'kinh-ram' then 'assets/media/catalog/accessory-kinh-ram.webp'
        when 'dong-ho-thong-minh' then 'assets/media/catalog/accessory-dong-ho.webp'
        else image_url
    end;

update public.studio_options
set description = case
        when option_type = 'pattern' and slug = 'plain' then 'Bề mặt trơn để tập trung vào phom, khuy và cấu trúc áo.'
        when option_type = 'pattern' and slug = 'cloud' then 'Vân mây cỡ nhỏ dùng như tham chiếu thị giác, không thay thế tư liệu phục dựng.'
        when option_type = 'pattern' and slug = 'lotus' then 'Mô-típ sen tham chiếu từ hiện vật gốm Việt, cần dùng tiết chế trên vải.'
        when option_type = 'scene' and slug = 'campus' then 'Khuôn viên đại học Việt Nam, hợp look đi học và walking shot.'
        when option_type = 'scene' and slug = 'old-quarter' then 'Phố cổ Hà Nội có chiều sâu kiến trúc và nhịp sống thật.'
        when option_type = 'scene' and slug = 'temple' then 'Sân Văn Miếu; cần giữ trang phục chỉnh tề và tôn trọng nội quy.'
        when option_type = 'scene' and slug = 'citadel' then 'Hoàng thành Thăng Long, phù hợp ảnh di sản và editorial.'
        when option_type = 'scene' and slug = 'studio' then 'Studio ánh sáng kiểm soát, tập trung vào phom và chất liệu.'
        when option_type = 'scene' and slug = 'ceremonial-space' then 'Không gian lễ nghi tham chiếu, ưu tiên bố cục trang trọng.'
        else description
    end,
    thumbnail_url = case
        when option_type = 'pattern' and slug = 'plain' then 'assets/media/catalog/pattern-plain.webp'
        when option_type = 'pattern' and slug = 'cloud' then 'assets/media/catalog/pattern-cloud.webp'
        when option_type = 'pattern' and slug = 'lotus' then 'assets/media/catalog/pattern-lotus.webp'
        when option_type = 'style' and slug in ('quiet-modern', 'minimal') then 'assets/media/catalog/scene-studio.webp'
        when option_type = 'style' and slug = 'heritage-editorial' then 'assets/media/catalog/garment-ao-nhat-binh.webp'
        when option_type = 'style' and slug in ('street-soft', 'streetwear') then 'assets/media/catalog/scene-old-quarter.webp'
        when option_type = 'style' and slug in ('school-polished', 'active') then 'assets/media/catalog/scene-campus.webp'
        when option_type = 'style' and slug = 'elegant' then 'assets/media/catalog/garment-ao-tac.webp'
        when option_type = 'style' and slug = 'vintage' then 'assets/media/catalog/garment-ao-ngu-than.webp'
        when option_type = 'scene' and slug = 'campus' then 'assets/media/catalog/scene-campus.webp'
        when option_type = 'scene' and slug = 'old-quarter' then 'assets/media/catalog/scene-old-quarter.webp'
        when option_type = 'scene' and slug = 'temple' then 'assets/media/catalog/scene-van-mieu.webp'
        when option_type = 'scene' and slug = 'citadel' then 'assets/media/catalog/scene-citadel.webp'
        when option_type = 'scene' and slug = 'studio' then 'assets/media/catalog/scene-studio.webp'
        when option_type = 'scene' and slug = 'ceremonial-space' then 'assets/media/catalog/scene-van-mieu.webp'
        else thumbnail_url
    end;

update public.studio_options
set description = case
        when option_type = 'color' and slug = 'indigo' then 'Sắc chàm sâu, phù hợp bản phối học đường và tối giản.'
        when option_type = 'color' and slug = 'ivory' then 'Sắc ngà ấm giúp bề mặt vải trông nhẹ và thanh lịch.'
        when option_type = 'color' and slug = 'vermilion' then 'Đỏ son tiết chế, tạo điểm nhấn cho dịp lễ và chân dung.'
        when option_type = 'color' and slug = 'beige' then 'Beige tự nhiên, dễ đi cùng phụ kiện da và canvas.'
        when option_type = 'color' and slug = 'brown' then 'Nâu đất trầm, hợp tinh thần di sản và ảnh ngoài trời.'
        when option_type = 'color' and slug = 'moss' then 'Xanh rêu dịu, cân bằng nét cổ truyền với nhịp phố.'
        when option_type = 'color' and slug = 'deep-red' then 'Đỏ trầm có chiều sâu, tránh cảm giác quá rực.'
        when option_type = 'color' and slug = 'white' then 'Trắng vải mềm, dùng làm nền sáng hoặc lớp trong.'
        when option_type = 'color' and slug = 'black' then 'Đen mềm, tạo tương phản nhưng vẫn giữ chi tiết phom.'
        when option_type = 'style' and slug = 'quiet-modern' then 'Phom sạch, màu lặng và một điểm nhấn hiện đại.'
        when option_type = 'style' and slug = 'heritage-editorial' then 'Nhấn chất liệu, cấu trúc áo và ánh sáng biên tập.'
        when option_type = 'style' and slug = 'street-soft' then 'Nhịp phố mềm, phụ kiện trẻ nhưng không che nhận diện áo.'
        when option_type = 'style' and slug = 'minimal' then 'Giảm phụ kiện và giữ khoảng thở cho tổng thể.'
        when option_type = 'style' and slug = 'school-polished' then 'Gọn, linh hoạt và chỉn chu cho môi trường học đường.'
        when option_type = 'style' and slug = 'elegant' then 'Tỷ lệ thanh lịch, phụ kiện tiết chế và ánh sáng dịu.'
        when option_type = 'style' and slug = 'streetwear' then 'Phối đô thị có nhịp mạnh nhưng vẫn giữ cấu trúc Việt phục.'
        when option_type = 'style' and slug = 'vintage' then 'Màu phim và cách tạo dáng gợi tư liệu ảnh xưa.'
        when option_type = 'style' and slug = 'active' then 'Ưu tiên chuyển động, giày nhẹ và phụ kiện thực dụng.'
        else description
    end,
    source_url = case
        when option_type = 'pattern' and slug = 'plain' then 'https://commons.wikimedia.org/wiki/File:Gfp-golden-chinese-fabric-texture.jpg'
        when option_type = 'pattern' and slug = 'cloud' then 'https://commons.wikimedia.org/wiki/File:Textile_Fragment_(Japan),_19th_century_(CH_18567527).jpg'
        when option_type = 'pattern' and slug = 'lotus' then 'https://commons.wikimedia.org/wiki/File:National_Museum_Vietnamese_History_29_(cropped).jpg'
        when option_type = 'scene' and slug = 'campus' then 'https://commons.wikimedia.org/wiki/File:RMIT_University_Vietnam_-_Campus.JPG'
        when option_type = 'scene' and slug = 'old-quarter' then 'https://commons.wikimedia.org/wiki/File:Old_Quarter_street_scene,_Hanoi_(1)_(38464672752).jpg'
        when option_type = 'scene' and slug in ('temple', 'ceremonial-space') then 'https://commons.wikimedia.org/wiki/File:Văn_Miếu,_Đống_Đa,_Hà_Nội,_Vietnam_-_panoramio.jpg'
        when option_type = 'scene' and slug = 'citadel' then 'https://commons.wikimedia.org/wiki/File:Central_Sector_of_the_Imperial_Citadel_of_Thang_Long_-_Hanoi.jpg'
        when option_type = 'scene' and slug = 'studio' then 'https://commons.wikimedia.org/wiki/File:Tokiwadai_Photo_Studio_2F_Interior.jpg'
        else source_url
    end;

update public.studio_locations
set image_url = case slug
        when 'van-mieu-quoc-tu-giam' then 'assets/media/catalog/scene-van-mieu.webp'
        when 'hoang-thanh-thang-long' then 'assets/media/catalog/scene-citadel.webp'
        when 'pho-co-ha-noi' then 'assets/media/catalog/scene-old-quarter.webp'
        else image_url
    end;

insert into public.cultural_sources
    (title, source_url, license, curator_note, review_status)
select *
from (
    values
        ('Tư liệu ảnh áo ngũ thân, khoảng 1904', 'https://commons.wikimedia.org/wiki/File:Ao_ngu_than_on_postcard_dated_1904.JPG', 'Public domain', 'Ảnh tham chiếu lịch sử cho catalog; không dùng thay cho hồ sơ phục dựng.', 'published'),
        ('Tư liệu ảnh áo tấc lụa Mã Châu', 'https://commons.wikimedia.org/wiki/File:Rio_m%C3%A3_ch%C3%A2u_%C3%A1o_t%E1%BA%A5c.jpg', 'CC BY-SA 4.0', 'Ảnh tham chiếu trực quan cho dáng áo tấc trong catalog.', 'published'),
        ('Tư liệu ảnh áo Nhật Bình', 'https://commons.wikimedia.org/wiki/File:Vietnamese_woman_wearing_%C3%81o_Nh%E1%BA%ADt_B%C3%ACnh.jpg', 'CC BY-SA 4.0', 'Ảnh lịch sử dùng để nhận diện mảng cổ và tỷ lệ trang phục.', 'published'),
        ('Tư liệu ảnh áo tứ thân', 'https://commons.wikimedia.org/wiki/File:%C3%81o_t%E1%BB%A9_th%C3%A2n_1a.jpg', 'CC BY-SA 3.0', 'Ảnh tham chiếu trực quan cho lớp áo, yếm và tổng thể Bắc Bộ.', 'published')
) as source(title, source_url, license, curator_note, review_status)
where not exists (
    select 1 from public.cultural_sources existing where existing.source_url = source.source_url
);

update public.studio_garments garment
set source_id = source.id
from public.cultural_sources source
where source.source_url = case garment.slug
    when 'ao-ngu-than-tay-chen' then 'https://commons.wikimedia.org/wiki/File:Ao_ngu_than_on_postcard_dated_1904.JPG'
    when 'ao-tac' then 'https://commons.wikimedia.org/wiki/File:Rio_m%C3%A3_ch%C3%A2u_%C3%A1o_t%E1%BA%A5c.jpg'
    when 'ao-nhat-binh' then 'https://commons.wikimedia.org/wiki/File:Vietnamese_woman_wearing_%C3%81o_Nh%E1%BA%ADt_B%C3%ACnh.jpg'
    when 'ao-tu-than' then 'https://commons.wikimedia.org/wiki/File:%C3%81o_t%E1%BB%A9_th%C3%A2n_1a.jpg'
    else ''
end;

-- Concrete selectable catalog items. Parent garment/accessory rows remain the
-- stable taxonomy while these rows can grow from curated partner/API imports.
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
select garment.id, garment.slug || '-mau-luu-tru',
    garment.name || ' — mẫu lưu trữ', garment.description, garment.category,
    'Chất liệu theo tư liệu đã duyệt',
    'Giữ đúng chi tiết nhận diện của loại trang phục',
    coalesce(garment.default_colors, '[]'::jsonb), garment.image_url,
    garment.thumbnail_url, garment.prompt_descriptor,
    garment.negative_descriptor, garment.source_id, source.source_url,
    'curated', 'published', 1, true
from public.studio_garments garment
left join public.cultural_sources source on source.id = garment.source_id
on conflict (slug) do update set
    name = excluded.name, description = excluded.description,
    image_url = excluded.image_url, thumbnail_url = excluded.thumbnail_url,
    prompt_descriptor = excluded.prompt_descriptor,
    negative_descriptor = excluded.negative_descriptor,
    source_id = excluded.source_id, source_url = excluded.source_url,
    review_status = 'published', is_active = true, updated_at = now();

insert into public.studio_accessory_variants (
    accessory_id, slug, name, description, material, color_palette,
    image_url, thumbnail_url, prompt_descriptor, source_provider,
    review_status, sort_order, is_active
)
select accessory.id, accessory.slug || '-mau-catalog',
    accessory.name || ' — mẫu catalog', accessory.description,
    'Chất liệu theo ảnh tham chiếu', '[]'::jsonb, accessory.image_url,
    accessory.thumbnail_url, accessory.prompt_descriptor, 'curated',
    'published', 1, true
from public.studio_accessories accessory
on conflict (slug) do update set
    name = excluded.name, description = excluded.description,
    image_url = excluded.image_url, thumbnail_url = excluded.thumbnail_url,
    prompt_descriptor = excluded.prompt_descriptor,
    review_status = 'published', is_active = true, updated_at = now();

-- The Audition catalog is seeded above and remains available for a fresh
-- database reset. Admin/API imports should update or archive rows instead of
-- clearing the public catalog.

-- Audition context metadata. Keep this in the preset JSON so Admin can extend
-- weather, audience and usage suggestions without a code deploy.
update public.studio_events
set preset = case slug
    when 'school' then jsonb_build_object('location', 'Campus Hà Nội', 'season', 'Mùa thu', 'weather', 'Trời mát, có nắng nhẹ', 'audience', 'học sinh, sinh viên', 'garment', 'ao-ngu-than-tay-chen', 'color', 'indigo', 'style', 'school-polished', 'scene', 'campus', 'suggestion', 'Sneaker trắng + túi tote')
    when 'street' then jsonb_build_object('location', 'Phố cổ Hà Nội', 'season', 'Mùa thu', 'weather', 'Khô ráo, ánh sáng dịu', 'audience', 'người trẻ khám phá thành phố', 'garment', 'ao-tu-than', 'color', 'moss', 'style', 'streetwear', 'scene', 'old-quarter', 'suggestion', 'Tote canvas + loafer')
    when 'ceremony' then jsonb_build_object('location', 'Văn Miếu – Quốc Tử Giám', 'season', 'Mùa thu', 'weather', 'Trời mát, ánh sáng tự nhiên', 'audience', 'lễ tốt nghiệp, cưới hỏi, sự kiện văn hóa', 'garment', 'ao-tac', 'color', 'vermilion', 'style', 'elegant', 'scene', 'temple', 'suggestion', 'Loafer + phụ kiện tiết chế')
    when 'portrait' then jsonb_build_object('location', 'Studio / Hoàng thành', 'season', 'Bốn mùa', 'weather', 'Ánh sáng được kiểm soát', 'audience', 'kỷ yếu, lookbook, ảnh cá nhân', 'garment', 'ao-nhat-binh', 'color', 'ivory', 'style', 'heritage-editorial', 'scene', 'studio', 'suggestion', 'Giữ nền sạch, ưu tiên chi tiết cổ áo')
    else preset
end,
updated_at = now()
where slug in ('school', 'street', 'ceremony', 'portrait');

update public.studio_generation_settings
set base_prompt = 'Ảnh gốc A: một nhân vật Việt mặc trang phục được chọn, đứng chính giữa, toàn thân, giữ cố định khuôn mặt, dáng đứng, góc máy và bố cục; ưu tiên 16:9 ở 1080p cho preview, sau đó có thể xuất lookbook 9:16.',
    updated_at = now()
where id = 1;

insert into public.cultural_rules (garment_id, rule_text, severity, context, review_status)
select g.id, v.rule_text, v.severity, v.context, 'approved'
from public.studio_garments g
join (values
    ('ao-tac', 'Dự lễ nên giữ cổ áo, hàng cúc và tay áo đúng phom; phụ kiện chỉ nên làm điểm nhấn.', 'warning', 'ceremony'),
    ('ao-nhat-binh', 'Không dùng phụ kiện hoặc họa tiết hiện đại để che mảng cổ đặc trưng của Nhật Bình.', 'warning', 'all'),
    ('ao-tu-than', 'Khi phối hiện đại vẫn cần giữ mối liên hệ giữa áo, yếm và thắt lưng.', 'warning', 'all')
) as v(slug, rule_text, severity, context) on v.slug = g.slug
where not exists (
    select 1 from public.cultural_rules r
    where r.garment_id = g.id and r.rule_text = v.rule_text
);

-- Audition presets describe demo scenarios, not live weather/geolocation.
update public.studio_events
set preset = preset || jsonb_build_object(
    'context_source', 'demo-preset',
    'pattern', 'plain',
    'accessories', case slug
        when 'school' then '["sneaker-trang","tui-tote"]'::jsonb
        when 'street' then '["giay-loafer","tui-tote"]'::jsonb
        when 'ceremony' then '["giay-loafer"]'::jsonb
        else '[]'::jsonb end
), updated_at = now()
where slug in ('school', 'street', 'ceremony', 'portrait');

-- Fill generation descriptors without inventing fabric, dynasty or price.
update public.studio_garments g
set prompt_descriptor = v.prompt,
    negative_descriptor = 'Do not crop or cut garment panels, erase collar or buttons, invent insignia, or substitute generic East Asian clothing.',
    allowed_contexts = v.contexts::jsonb,
    default_colors = v.colors::jsonb,
    updated_at = now()
from (values
    ('ao-ngu-than-tay-chen', 'Vietnamese ao ngu than tay chen; preserve five-panel construction, fitted sleeves, collar and button line. Modern accessories must not conceal the garment.', '["school","street","ceremony","portrait"]', '["indigo","beige","ivory"]'),
    ('ao-tac', 'Vietnamese ao tac; preserve its formal silhouette, wide sleeves, collar, buttons and full-length panels. Style respectfully for the selected event.', '["ceremony","portrait"]', '["vermilion","ivory","deep-red"]'),
    ('ao-nhat-binh', 'Vietnamese ao Nhat Binh; preserve the distinctive collar panel and visible garment proportions in the approved reference. Do not invent court rank or royal insignia.', '["ceremony","portrait"]', '["ivory","deep-red","indigo"]'),
    ('ao-tu-than', 'Vietnamese ao tu than; preserve the relationship of the outer garment, yem and waist sash shown by the approved reference. Use restrained contemporary accessories.', '["street","portrait"]', '["moss","brown","beige"]')
) as v(slug, prompt, contexts, colors)
where g.slug = v.slug and g.prompt_descriptor = '';

update public.studio_accessories a
set prompt_descriptor = v.prompt, compatibility = v.compatibility::jsonb, updated_at = now()
from (values
    ('sneaker-trang', 'Low-profile white sneakers, practical and unbranded; keep garment panels visible.', '{"suggested_contexts":["school","street","portrait"],"styling_note":"Kiểm tra quy định giày dép của nơi tổ chức khi dự lễ."}'),
    ('giay-loafer', 'Simple loafers with a restrained silhouette and no visible brand logo.', '{"suggested_contexts":["school","street","ceremony","portrait"]}'),
    ('tui-tote', 'Practical tote bag carried at the side, not across the collar or button line.', '{"suggested_contexts":["school","street"],"styling_note":"Không để túi che hàng khuy và vạt áo."}'),
    ('kinh-ram', 'Minimal sunglasses as an optional outdoor fashion accent, not covering garment details.', '{"suggested_contexts":["street","portrait"],"styling_note":"Cân nhắc tháo kính trong không gian nghi lễ."}'),
    ('dong-ho-thong-minh', 'Discreet smartwatch visible at the wrist without obscuring sleeve construction.', '{"suggested_contexts":["school","street","portrait"]}')
) as v(slug, prompt, compatibility)
where a.slug = v.slug and a.prompt_descriptor = '';

update public.studio_garment_variants v
set prompt_descriptor = g.prompt_descriptor, negative_descriptor = g.negative_descriptor,
    updated_at = now()
from public.studio_garments g
where v.garment_id = g.id and v.source_provider = 'curated' and v.prompt_descriptor = '';

update public.studio_accessory_variants v
set prompt_descriptor = a.prompt_descriptor, updated_at = now()
from public.studio_accessories a
where v.accessory_id = a.id and v.source_provider = 'curated' and v.prompt_descriptor = '';

-- Version the new contract rather than silently changing historical job prompts.
update public.studio_prompt_versions set is_active = false where slug = 'outfit-image';
insert into public.studio_prompt_versions (slug, version, model, system_prompt, eval_notes, is_active)
values (
    'outfit-image', 2, 'gemini',
    'Act as a Gen Z stylist and cultural guide. Use only supplied approved catalog facts for historical statements. Preserve garment structure and explain in Vietnamese with 2-3 concise sentences for story. Respect user selections and locks. Context marked demo-preset is illustrative, not live weather. Return JSON with exactly story, guardrail, genZTip, culturalScore, imagePrompt, confidence. culturalScore is a tentative 0-100 assessment of the SELECTED styling against supplied rules, not expert certification and not an assessment of a generated image. Explain cautions and actionable corrections in guardrail. Never award cultural validity solely because a color or accessory is selected. confidence is 0-1; lower it when sources or rules are incomplete. imagePrompt must include concrete item descriptors, negative constraints, location, palette, accessories and locks; no invented historical claims, text, logo or watermark.',
    'Schema tests and 4x4 garment/event fallback cases. Null score on fallback; no fabricated live context; approved sources only. Live provider/image fidelity requires separate QA.',
    true
)
on conflict (slug, version) do update set
    system_prompt = excluded.system_prompt, eval_notes = excluded.eval_notes, is_active = true;

-- Independent Studio illustration; never replaces Tier 1 experience media.
alter table public.studio_generation_settings
    add column if not exists preview_media_url text not null default '',
    add column if not exists preview_poster_url text not null default '';

update public.studio_generation_settings
set preview_media_url = 'assets/media/studio-atelier-loop.mp4',
    preview_poster_url = 'assets/media/studio-atelier-poster.png',
    updated_at = now()
where id = 1;

-- Durable result library and atomic server-only generation admission.
alter table public.looks add column if not exists client_save_id uuid;
alter table public.looks add column if not exists storage_path text;
create unique index if not exists looks_user_save_id_idx on public.looks(user_id, client_save_id);
alter table public.generation_jobs add column if not exists owner_session_hash text;
alter table public.generation_jobs add column if not exists provider text;
alter table public.generation_jobs add column if not exists cost_source text not null default 'estimate';
insert into storage.buckets(id, name, public) values ('generated-lookbooks', 'generated-lookbooks', false)
on conflict(id) do nothing;

create index if not exists studio_history_user_idx on public.generation_jobs(user_id,status,created_at);
create index if not exists studio_history_root_idx on public.generation_jobs((input->'history'->>'rootJobId'));
create index if not exists studio_history_look_idx on public.generation_jobs((input->'history'->>'rootLookId'));

create or replace function public.reserve_local_generation(p_request uuid, p_user uuid, p_owner text, p_input jsonb)
returns setof public.generation_jobs language plpgsql security definer set search_path = public as $$
declare existing public.generation_jobs; cfg public.ai_runtime_settings; estimate numeric; spent numeric;
begin
  perform pg_advisory_xact_lock(728193);
  select * into existing from public.generation_jobs where client_request_id = p_request;
  if found then
    if existing.owner_session_hash is distinct from p_owner and (p_user is null or existing.user_id is distinct from p_user) then
      raise exception 'Yêu cầu không thuộc phiên của bạn.';
    end if;
    return next existing; return;
  end if;
  select * into cfg from public.ai_runtime_settings where id = 1;
  if cfg.id is null or not cfg.generation_enabled then raise exception 'Tạo ảnh đang tạm dừng trong Admin.'; end if;
  estimate := case when p_input->>'_provider' = 'supabase-edge' then greatest(0,coalesce((p_input->>'_estimate')::numeric,cfg.image_unit_cost_vnd)) else cfg.image_unit_cost_vnd end;
  if exists(select 1 from public.generation_jobs where owner_session_hash = p_owner and status in ('queued','processing')) then
    raise exception 'Bản phối trước vẫn đang xử lý. Hãy xem tiến trình trước khi tạo thêm.';
  end if;
  if (select count(*) from public.generation_jobs where owner_session_hash = p_owner and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'Bạn đang tạo quá nhanh. Hãy đợi một phút.';
  end if;
  select coalesce(sum(estimated_cost_vnd),0) into spent from public.generation_jobs
    where created_at >= date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
    and status <> 'cancelled';
  if cfg.daily_budget_vnd > 0 and spent + estimate > cfg.daily_budget_vnd then raise exception 'Đã đạt ngân sách tạo ảnh trong ngày.'; end if;
  select coalesce(sum(estimated_cost_vnd),0) into spent from public.generation_jobs
    where created_at >= date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
    and status <> 'cancelled';
  if cfg.monthly_budget_vnd > 0 and spent + estimate > cfg.monthly_budget_vnd then raise exception 'Đã đạt ngân sách tạo ảnh trong tháng.'; end if;
  return query insert into public.generation_jobs(client_request_id,user_id,owner_session_hash,provider,status,input,estimated_cost_vnd,cost_source)
    values(p_request,p_user,p_owner,coalesce(p_input->>'_provider','gemini-webapi-local'),'queued',p_input,estimate,'admin-estimate') returning *;
end $$;

create or replace function public.save_studio_look(p_user uuid, p_save uuid, p_record jsonb, p_images jsonb)
returns setof public.looks language plpgsql security definer set search_path = public as $$
declare saved public.looks; image jsonb; idx integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || p_save::text, 0));
  select * into saved from public.looks where user_id=p_user and client_save_id=p_save;
  if found then return next saved; return; end if;
  insert into public.looks(user_id,client_save_id,name,occasion_slug,garment_slug,color_slug,pattern_slug,style_slug,scene_slug,
    selection,locks,image_url,storage_path,generation_job_id,prompt_version_id,visibility)
    values(p_user,p_save,p_record->>'name',p_record->>'occasion_slug',p_record->>'garment_slug',
      p_record->>'color_slug',p_record->>'pattern_slug',p_record->>'style_slug',p_record->>'scene_slug',
      p_record->'selection',coalesce(p_record->'locks','{}'),p_record->>'image_url',p_record->>'storage_path',
      (p_record->>'generation_job_id')::uuid,(p_record->>'prompt_version_id')::uuid,'private') returning * into saved;
  for image in select * from jsonb_array_elements(p_images) loop
    insert into public.look_variants(look_id,variant_index,label,selection,image_url,generation_job_id,prompt_version_id)
      values(saved.id,idx,case when idx=0 then 'Bản gốc' else 'Bản phối ' || idx end,saved.selection,image->>'url',saved.generation_job_id,saved.prompt_version_id);
    idx := idx + 1;
  end loop;
  insert into public.look_accessories(look_id,accessory_id,accessory_name)
    select distinct saved.id,a.id,a.name from public.studio_accessories a
    where a.slug in (select jsonb_array_elements_text(coalesce(saved.selection->'accessories','[]'::jsonb)));
  return next saved;
end $$;
revoke all on function public.reserve_local_generation(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_local_generation(uuid,uuid,text,jsonb) to service_role;
revoke all on function public.save_studio_look(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_studio_look(uuid,uuid,jsonb,jsonb) to service_role;

insert into public.studio_prompt_versions(slug,version,model,system_prompt,eval_notes,is_active)
values('studio-group-web',1,'gemini-webapi',
 'Generate one cohesive group photograph from the approved catalog. Preserve garment construction, people assignments, face-reference consent and requested composition. Do not add people, collage panels, labels or text. Measurements are illustrative, not sizing advice.',
 'Prompt metadata for the single-result four-step Studio workflow. Provider image quality requires a real generation test.',true)
on conflict(slug,version) do nothing;

create or replace function public.studio_usage_summary()
returns jsonb language sql security definer set search_path = public as $$
 select jsonb_build_object(
   'today_cost_vnd',coalesce(sum(estimated_cost_vnd) filter(where created_at >= date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'),0),
   'month_cost_vnd',coalesce(sum(estimated_cost_vnd),0),
   'month_images',coalesce(sum(image_count) filter(where status='completed'),0),
   'month_videos',coalesce(sum(video_count) filter(where status='completed'),0),
   'month_jobs',count(*),
   'cost_source','admin-estimate',
   'actual_cost_vnd',null)
 from public.generation_jobs
 where created_at >= date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' and status<>'cancelled';
$$;
revoke all on function public.studio_usage_summary() from public,anon,authenticated;
grant execute on function public.studio_usage_summary() to service_role;

-- Private account draft. Null payload is a tombstone against stale-tab writes.
create table if not exists public.studio_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint studio_draft_size check (payload is null or octet_length(payload::text) <= 100000)
);
alter table public.studio_drafts enable row level security;
drop policy if exists "Read own Studio draft" on public.studio_drafts;
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
