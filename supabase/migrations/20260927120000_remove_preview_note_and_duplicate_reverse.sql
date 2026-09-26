-- This copy was removed from the product; do not keep a dormant CMS field.
alter table public.pages drop column if exists preview_note;

-- An empty reverse URL is the explicit contract for automatic reverse playback.
update public.experience_branches
set reverse_media_url = null
where nullif(trim(reverse_media_url), '') is null
   or reverse_media_url = forward_media_url;
