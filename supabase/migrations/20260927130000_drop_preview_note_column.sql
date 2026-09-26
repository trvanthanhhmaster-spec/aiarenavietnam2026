-- preview_note is no longer part of the product contract or UI.
alter table public.pages drop column if exists preview_note;
