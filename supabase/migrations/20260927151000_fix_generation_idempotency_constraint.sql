-- PostgREST needs a non-partial unique index for on_conflict inference.
drop index if exists public.generation_jobs_client_request_idx;

create unique index if not exists generation_jobs_client_request_idx
    on public.generation_jobs (client_request_id);
