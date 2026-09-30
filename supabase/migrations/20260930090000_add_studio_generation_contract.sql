create table if not exists public.studio_generation_settings (
    id smallint primary key default 1 check (id = 1),
    canvas_aspect_ratio text not null default '16:9' check (canvas_aspect_ratio in ('16:9', '1:1', '9:16')),
    target_resolution text not null default '1080' check (target_resolution in ('720', '1080', '2160')),
    default_generation_mode text not null default 'text-to-image' check (default_generation_mode in ('text-to-image', 'image-to-image')),
    base_prompt text not null default 'Ảnh gốc A: một nhân vật Việt mặc trang phục được chọn, đứng chính giữa, toàn thân, góc máy và bố cục ổn định.',
    frame_plan jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.ai_runtime_settings
    add column if not exists gemini_api_key_hint text;

insert into public.studio_generation_settings (
    id,
    canvas_aspect_ratio,
    target_resolution,
    default_generation_mode,
    base_prompt,
    frame_plan
) values (
    1,
    '16:9',
    '1080',
    'text-to-image',
    'Ảnh gốc A: một nhân vật Việt mặc trang phục được chọn, đứng chính giữa, toàn thân, góc máy và bố cục ổn định.',
    jsonb_build_array(
        jsonb_build_object(
            'key', 'A',
            'label', 'Ảnh gốc',
            'branch_key', 'base',
            'change_scope', 'Cố định nhân vật, khuôn mặt, dáng đứng, góc máy và bố cục.',
            'prompt_template', 'Create the locked source frame A. Preserve the subject identity, face, pose, camera angle and composition.'
        ),
        jsonb_build_object(
            'key', 'B',
            'label', 'Bối cảnh',
            'branch_key', 'event',
            'change_scope', 'Chỉ thay phông nền và bối cảnh; giữ nhân vật, trang phục, vị trí và kích thước.',
            'prompt_template', 'Change only the background and scene. Keep the subject, garment, camera, position and scale identical to frame A.'
        ),
        jsonb_build_object(
            'key', 'C',
            'label', 'Ánh sáng',
            'branch_key', 'lighting',
            'change_scope', 'Chỉ thay ánh sáng và thời điểm trong ngày; giữ phông nền, nhân vật và trang phục.',
            'prompt_template', 'Change only the lighting and time of day. Keep the background, subject, garment, camera, position and scale identical to frame A.'
        ),
        jsonb_build_object(
            'key', 'D',
            'label', 'Trang phục',
            'branch_key', 'garment',
            'change_scope', 'Chỉ thay quần áo; giữ nhân vật, khuôn mặt, dáng đứng, góc máy và bố cục.',
            'prompt_template', 'Change only the clothing and garment styling. Keep the subject identity, face, pose, camera and composition identical to frame A.'
        ),
        jsonb_build_object(
            'key', 'E',
            'label', 'Nhân vật',
            'branch_key', 'character',
            'change_scope', 'Chỉ thay nhân vật; giữ vị trí, kích thước, góc máy và bố cục tương đương.',
            'prompt_template', 'Change only the subject identity. Keep the framing, position, scale, camera angle, background and garment composition equivalent to frame A.'
        )
    )
)
on conflict (id) do nothing;

alter table public.studio_generation_settings enable row level security;
drop policy if exists "public can read studio generation settings" on public.studio_generation_settings;
create policy "public can read studio generation settings"
    on public.studio_generation_settings for select
    using (true);
