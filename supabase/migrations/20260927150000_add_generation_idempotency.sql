-- Keep browser retries and page reloads attached to one generation job.
alter table public.generation_jobs
    add column if not exists client_request_id uuid;

create unique index if not exists generation_jobs_client_request_idx
    on public.generation_jobs (client_request_id)
    where client_request_id is not null;
