create table if not exists public.ai_runtime_settings (
    id smallint primary key default 1 check (id = 1),
    generation_enabled boolean not null default true,
    image_provider text not null default 'env' check (image_provider in ('env', 'gemini', 'vertex')),
    video_provider text not null default 'env' check (video_provider in ('env', 'gemini', 'vertex')),
    text_model text not null default 'gemini-2.5-flash',
    image_model text not null default 'gemini-2.5-flash-image',
    video_model text not null default 'veo-3.1-fast-generate-001',
    image_variants smallint not null default 4 check (image_variants between 1 and 4),
    image_unit_cost_vnd numeric(14, 2) not null default 0 check (image_unit_cost_vnd >= 0),
    video_unit_cost_vnd numeric(14, 2) not null default 0 check (video_unit_cost_vnd >= 0),
    daily_budget_vnd numeric(14, 2) not null default 0 check (daily_budget_vnd >= 0),
    monthly_budget_vnd numeric(14, 2) not null default 0 check (monthly_budget_vnd >= 0),
    encrypted_gemini_api_key text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into public.ai_runtime_settings (
    id,
    generation_enabled,
    image_provider,
    video_provider,
    text_model,
    image_model,
    video_model,
    image_variants
) values (
    1,
    true,
    'env',
    'env',
    'gemini-2.5-flash',
    'gemini-2.5-flash-image',
    'veo-3.1-fast-generate-001',
    4
)
on conflict (id) do nothing;

alter table public.ai_runtime_settings enable row level security;
revoke all on public.ai_runtime_settings from anon, authenticated;

alter table public.generation_jobs
    add column if not exists estimated_cost_vnd numeric(14, 2) not null default 0,
    add column if not exists image_count smallint not null default 0,
    add column if not exists video_count smallint not null default 0;

create index if not exists generation_jobs_cost_created_idx
    on public.generation_jobs (created_at desc, status);
