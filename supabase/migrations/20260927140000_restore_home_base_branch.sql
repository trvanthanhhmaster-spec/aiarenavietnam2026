-- The branch keys were renamed from legacy presentation keys to semantic slugs.
update public.experience_branches
set is_base = false
where page_slug = 'home';

update public.experience_branches
set is_base = true
where page_slug = 'home'
  and branch_key = 'dule';
