-- User-managed copy must not be restored by a seed replay.
update public.pages
set preview_note = ''
where slug = 'home';

-- An empty reverse URL is the explicit contract for automatic reverse playback.
update public.experience_branches
set reverse_media_url = null
where nullif(trim(reverse_media_url), '') is null
   or reverse_media_url = forward_media_url;
