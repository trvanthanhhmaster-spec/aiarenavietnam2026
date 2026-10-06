-- Independent Studio illustration; never replaces Tier 1 experience media.
alter table public.studio_generation_settings
    add column if not exists preview_media_url text not null default '',
    add column if not exists preview_poster_url text not null default '';

update public.studio_generation_settings
set preview_media_url = 'assets/media/studio-atelier-loop.mp4',
    preview_poster_url = 'assets/media/studio-atelier-poster.png',
    updated_at = now()
where id = 1;
