-- Run against the migrated schema inside one transaction, ALWAYS rolling back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); reviewer uuid:=gen_random_uuid();
  s uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); garment uuid; payload jsonb; n bigint;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (a,'qa-fashion-'||a||'@example.invalid','{}'),(b,'qa-fashion-'||b||'@example.invalid','{}'),(reviewer,'qa-fashion-'||reviewer||'@example.invalid','{}');
  insert into user_roles(user_id,role) values(reviewer,'admin');
  select id into garment from studio_garments where is_active limit 1;
  if garment is null then raise exception 'Need an active garment'; end if;
  perform fashion_submit_shop(a,s,0,'{"name":"QA shop - rolled back","description":"QA","province":"Hà Nội","address":"QA","contact_url":"https://example.com/contact","website_url":""}');
  begin
    perform fashion_submit_shop(b,s,1,'{"name":"Foreign mutation"}'); raise exception 'TEST_FAILED foreign shop';
  exception when others then if sqlerrm not like '%FORBIDDEN%' then raise; end if; end;
  begin
    perform fashion_submit_shop(a,s,0,'{}'); raise exception 'TEST_FAILED duplicate';
  exception when others then if sqlerrm not like '%CONFLICT%' then raise; end if; end;
  payload=jsonb_build_object('garment_id',garment,'name','QA product','description','QA','source_url','https://example.com/product',
    'variant_name','Red','color','Red','material','silk','pattern','plain','sizes','contact','included_accessories','none',
    'image_url','https://example.com/a.jpg','ai_permission','requested','permission_evidence','QA permission evidence',
    'offers',jsonb_build_array(jsonb_build_object('kind','rent','price_vnd',null,'deposit_vnd',100000,'unit','set/day','terms','contact')));
  perform fashion_submit_product(a,s,p,0,payload);
  begin
    perform fashion_submit_product(b,s,p,1,payload); raise exception 'TEST_FAILED foreign product';
  exception when others then if sqlerrm not like '%FORBIDDEN%' then raise; end if; end;
  begin
    perform fashion_review(a,'shop',s,1,'published','',false); raise exception 'TEST_FAILED non-admin';
  exception when others then if sqlerrm not like '%FORBIDDEN%' then raise; end if; end;
  begin
    perform fashion_review(reviewer,'product',p,1,'published','',false); raise exception 'TEST_FAILED unapproved shop';
  exception when others then if sqlerrm not like '%SHOP_NOT_PUBLISHED%' then raise; end if; end;
  perform fashion_review(reviewer,'shop',s,1,'published','QA approval',false);
  perform fashion_review(reviewer,'product',p,1,'published','QA approval',true);
  if not exists(select 1 from fashion_product_media where product_id=p and ai_permission='granted' and permission_verified_at is not null) then raise exception 'TEST_FAILED permission'; end if;
  if has_function_privilege('anon','public.fashion_submit_shop(uuid,uuid,bigint,jsonb)','execute') then raise exception 'TEST_FAILED public RPC'; end if;
  if has_column_privilege('anon','public.fashion_product_media','permission_evidence','select') then raise exception 'TEST_FAILED evidence leak'; end if;
  if has_table_privilege('authenticated','public.fashion_products','update') then raise exception 'TEST_FAILED direct write'; end if;
  perform fashion_submit_product(a,s,p,2,payload);
  if exists(select 1 from fashion_products where id=p and status='published') then raise exception 'TEST_FAILED live mutation'; end if;
  if not exists(select 1 from fashion_product_offers where product_id=p and price_vnd is null and deposit_vnd=100000) then raise exception 'TEST_FAILED prices'; end if;
  -- A malformed child rolls back the entire RPC, including revision/child replacement.
  begin
    perform fashion_submit_product(a,s,p,3,jsonb_set(payload,'{offers}','[{"kind":"invalid"}]')); raise exception 'TEST_FAILED atomicity';
  exception when check_violation or not_null_violation then null; end;
  select revision into n from fashion_products where id=p;
  if n<>3 or not exists(select 1 from fashion_product_offers where product_id=p and kind='rent') then raise exception 'TEST_FAILED rollback'; end if;
  if (select count(*) from fashion_review_log where entity_id in (s,p))<>5 then raise exception 'TEST_FAILED audit'; end if;
  set local role anon;
  if (select count(*) from fashion_shops where id=s)<>1 then raise exception 'TEST_FAILED published shop invisible'; end if;
  if exists(select 1 from fashion_products where id=p) or exists(select 1 from fashion_product_variants where product_id=p) or exists(select 1 from fashion_product_offers where product_id=p) then raise exception 'TEST_FAILED pending leak'; end if;
  reset role;
  perform fashion_review(reviewer,'product',p,3,'published','QA approval',true);
  set local role anon;
  if (select count(*) from fashion_products where id=p)<>1 or (select count(*) from fashion_product_media where product_id=p)<>1 then raise exception 'TEST_FAILED public children'; end if;
  reset role;
  perform fashion_review(reviewer,'shop',s,2,'archived','QA archive',false);
  set local role anon;
  if exists(select 1 from fashion_shops where id=s) or exists(select 1 from fashion_products where id=p) or exists(select 1 from fashion_product_offers where product_id=p) then raise exception 'TEST_FAILED archived parent leak'; end if;
  reset role;
end $$;
rollback;
select 'Ownership, review, conflict, permission, price and transaction rollback checks passed; no fixtures retained.' as result;
