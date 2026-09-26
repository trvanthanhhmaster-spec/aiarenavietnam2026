alter table public.experience_branches
    add column if not exists is_base boolean not null default false;

update public.experience_branches
set is_base = (branch_key = 'dule')
where page_slug = 'home';

create unique index if not exists one_base_branch_per_page_idx
    on public.experience_branches (page_slug)
    where is_base = true;
