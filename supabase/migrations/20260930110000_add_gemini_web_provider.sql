alter table public.ai_runtime_settings
    drop constraint if exists ai_runtime_settings_image_provider_check;

alter table public.ai_runtime_settings
    add constraint ai_runtime_settings_image_provider_check
    check (image_provider in ('env', 'gemini', 'vertex', 'webapi'));
