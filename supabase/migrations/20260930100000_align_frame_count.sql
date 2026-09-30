-- Studio produces one locked source frame A plus four controlled destinations.
alter table public.ai_runtime_settings
    drop constraint if exists ai_runtime_settings_image_variants_check;

alter table public.ai_runtime_settings
    add constraint ai_runtime_settings_image_variants_check
    check (image_variants between 1 and 5);

update public.ai_runtime_settings
set image_variants = 5
where id = 1 and image_variants = 4;
