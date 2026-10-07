insert into public.studio_prompt_versions(slug,version,model,system_prompt,eval_notes,is_active)
values('studio-group-web',1,'gemini-webapi',
 'Generate one cohesive group photograph from the approved catalog. Preserve garment construction, people assignments, face-reference consent and requested composition. Do not add people, collage panels, labels or text. Measurements are illustrative, not sizing advice.',
 'Prompt metadata for the single-result four-step Studio workflow. Provider image quality requires a real generation test.',true)
on conflict(slug,version) do nothing;

create or replace function public.studio_usage_summary()
returns jsonb language sql security definer set search_path = public as $$
 select jsonb_build_object(
   'today_cost_vnd',coalesce(sum(estimated_cost_vnd) filter(where created_at >= date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'),0),
   'month_cost_vnd',coalesce(sum(estimated_cost_vnd),0),
   'month_images',coalesce(sum(image_count) filter(where status='completed'),0),
   'month_videos',coalesce(sum(video_count) filter(where status='completed'),0),
   'month_jobs',count(*),
   'cost_source','admin-estimate',
   'actual_cost_vnd',null)
 from public.generation_jobs
 where created_at >= date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' and status<>'cancelled';
$$;
revoke all on function public.studio_usage_summary() from public,anon,authenticated;
grant execute on function public.studio_usage_summary() to service_role;
