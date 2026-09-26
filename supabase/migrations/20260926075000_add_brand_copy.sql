alter table public.pages
    add column if not exists brand_mark text not null default 'V',
    add column if not exists brand_name text not null default 'Remix';

update public.pages
set brand_mark = 'V',
    brand_name = 'Remix'
where slug = 'home';
