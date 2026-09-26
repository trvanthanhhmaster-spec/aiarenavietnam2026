-- V-Remix content model for Supabase.
create table if not exists public.pages (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    brand_mark text not null,
    brand_name text not null,
    title text not null,
    description text not null,
    preview_note text not null,
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
    slug, name, brand_mark, brand_name, title, description, preview_note,
    hero_line_one, hero_line_two, hero_description_one, hero_description_two,
    controller_label, cta_label, ui, media_url
) values (
    'home',
    'V-Remix',
    'V',
    'Remix',
    'V-Remix — Việt phục, theo cách bạn',
    'Khám phá cách mặc Việt phục khi đi học, dạo phố, dự lễ hoặc chụp ảnh. Gần gũi hơn với trang phục Việt, tự tin hơn với phong cách của bạn.',
    '',
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
    preview_note = excluded.preview_note,
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
