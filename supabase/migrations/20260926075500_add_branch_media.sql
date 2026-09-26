alter table public.experience_branches
    add column if not exists forward_media_url text,
    add column if not exists reverse_media_url text;

update public.experience_branches
set forward_media_url = coalesce(
        nullif(forward_media_url, ''),
        (select media_url from public.pages where slug = experience_branches.page_slug)
    ),
    reverse_media_url = coalesce(
        nullif(reverse_media_url, ''),
        (select media_url from public.pages where slug = experience_branches.page_slug)
    );

alter table public.experience_branches
    alter column forward_media_url set not null,
    alter column reverse_media_url drop not null;
