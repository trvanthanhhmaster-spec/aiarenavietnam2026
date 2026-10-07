-- Durable result library and atomic server-only generation admission.
alter table public.looks add column if not exists client_save_id uuid;
alter table public.looks add column if not exists storage_path text;
create unique index if not exists looks_user_save_id_idx on public.looks(user_id, client_save_id);
alter table public.generation_jobs add column if not exists owner_session_hash text;
alter table public.generation_jobs add column if not exists provider text;
alter table public.generation_jobs add column if not exists cost_source text not null default 'estimate';
insert into storage.buckets(id, name, public) values ('generated-lookbooks', 'generated-lookbooks', false)
on conflict(id) do nothing;

create or replace function public.reserve_local_generation(p_request uuid, p_user uuid, p_owner text, p_input jsonb)
returns setof public.generation_jobs language plpgsql security definer set search_path = public as $$
declare existing public.generation_jobs; cfg public.ai_runtime_settings; estimate numeric; spent numeric;
begin
  perform pg_advisory_xact_lock(728193);
  select * into existing from public.generation_jobs where client_request_id = p_request;
  if found then
    if existing.owner_session_hash is distinct from p_owner and (p_user is null or existing.user_id is distinct from p_user) then
      raise exception 'Yêu cầu không thuộc phiên của bạn.';
    end if;
    return next existing; return;
  end if;
  select * into cfg from public.ai_runtime_settings where id = 1;
  if cfg.id is null or not cfg.generation_enabled then raise exception 'Tạo ảnh đang tạm dừng trong Admin.'; end if;
  estimate := case when p_input->>'_provider' = 'supabase-edge' then greatest(0,coalesce((p_input->>'_estimate')::numeric,cfg.image_unit_cost_vnd)) else cfg.image_unit_cost_vnd end;
  if exists(select 1 from public.generation_jobs where owner_session_hash = p_owner and status in ('queued','processing')) then
    raise exception 'Bản phối trước vẫn đang xử lý. Hãy xem tiến trình trước khi tạo thêm.';
  end if;
  if (select count(*) from public.generation_jobs where owner_session_hash = p_owner and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'Bạn đang tạo quá nhanh. Hãy đợi một phút.';
  end if;
  select coalesce(sum(estimated_cost_vnd),0) into spent from public.generation_jobs
    where created_at >= date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
    and status <> 'cancelled';
  if cfg.daily_budget_vnd > 0 and spent + estimate > cfg.daily_budget_vnd then raise exception 'Đã đạt ngân sách tạo ảnh trong ngày.'; end if;
  select coalesce(sum(estimated_cost_vnd),0) into spent from public.generation_jobs
    where created_at >= date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
    and status <> 'cancelled';
  if cfg.monthly_budget_vnd > 0 and spent + estimate > cfg.monthly_budget_vnd then raise exception 'Đã đạt ngân sách tạo ảnh trong tháng.'; end if;
  return query insert into public.generation_jobs(client_request_id,user_id,owner_session_hash,provider,status,input,estimated_cost_vnd,cost_source)
    values(p_request,p_user,p_owner,coalesce(p_input->>'_provider','gemini-webapi-local'),'queued',p_input,estimate,'admin-estimate') returning *;
end $$;

create or replace function public.save_studio_look(p_user uuid, p_save uuid, p_record jsonb, p_images jsonb)
returns setof public.looks language plpgsql security definer set search_path = public as $$
declare saved public.looks; image jsonb; idx integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || p_save::text, 0));
  select * into saved from public.looks where user_id=p_user and client_save_id=p_save;
  if found then return next saved; return; end if;
  insert into public.looks(user_id,client_save_id,name,occasion_slug,garment_slug,color_slug,pattern_slug,style_slug,scene_slug,
    selection,locks,image_url,storage_path,generation_job_id,prompt_version_id,visibility)
    values(p_user,p_save,p_record->>'name',p_record->>'occasion_slug',p_record->>'garment_slug',
      p_record->>'color_slug',p_record->>'pattern_slug',p_record->>'style_slug',p_record->>'scene_slug',
      p_record->'selection',coalesce(p_record->'locks','{}'),p_record->>'image_url',p_record->>'storage_path',
      (p_record->>'generation_job_id')::uuid,(p_record->>'prompt_version_id')::uuid,'private') returning * into saved;
  for image in select * from jsonb_array_elements(p_images) loop
    insert into public.look_variants(look_id,variant_index,label,selection,image_url,generation_job_id,prompt_version_id)
      values(saved.id,idx,case when idx=0 then 'Bản gốc' else 'Bản phối ' || idx end,saved.selection,image->>'url',saved.generation_job_id,saved.prompt_version_id);
    idx := idx + 1;
  end loop;
  insert into public.look_accessories(look_id,accessory_id,accessory_name)
    select distinct saved.id,a.id,a.name from public.studio_accessories a
    where a.slug in (select jsonb_array_elements_text(coalesce(saved.selection->'accessories','[]'::jsonb)));
  return next saved;
end $$;
revoke all on function public.reserve_local_generation(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_local_generation(uuid,uuid,text,jsonb) to service_role;
revoke all on function public.save_studio_look(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_studio_look(uuid,uuid,jsonb,jsonb) to service_role;
