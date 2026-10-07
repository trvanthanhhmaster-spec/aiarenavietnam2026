-- History is durable generation data; only completed results appear in the strip.
create index if not exists studio_history_user_idx on public.generation_jobs(user_id, status, created_at);
create index if not exists studio_history_root_idx on public.generation_jobs((input->'history'->>'rootJobId'));
create index if not exists studio_history_look_idx on public.generation_jobs((input->'history'->>'rootLookId'));
