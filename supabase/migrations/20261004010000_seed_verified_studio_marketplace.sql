-- Initial public marketplace sources verified from each provider's public site.
-- Admin can replace, archive or expand these records without changing Studio.
insert into public.studio_marketplace_listings (
    item_type, garment_id, provider_name, listing_type, title,
    address, province, external_url, source_url, verified_at, sort_order
)
select
    'garment',
    garment.id,
    'V''style – Việt Cổ Phục',
    'both',
    'Xem danh mục ' || garment.name,
    'SN 3B, ngõ 94 Hoàng Ngân, Cầu Giấy',
    'Hà Nội',
    'https://vietphuc.net/trang-phuc-cho-thue',
    'https://vietphuc.net/',
    now(),
    1
from public.studio_garments as garment
where not exists (
    select 1
    from public.studio_marketplace_listings as listing
    where listing.garment_id = garment.id
      and listing.provider_name = 'V''style – Việt Cổ Phục'
);

insert into public.studio_marketplace_listings (
    item_type, garment_id, provider_name, listing_type, title,
    province, external_url, source_url, verified_at, sort_order
)
select
    'garment',
    garment.id,
    'Tô Hà Style',
    'both',
    'Tham khảo ' || garment.name,
    'Hà Nội',
    'https://tohastyle.com.vn/',
    'https://tohastyle.com.vn/',
    now(),
    2
from public.studio_garments as garment
where not exists (
    select 1
    from public.studio_marketplace_listings as listing
    where listing.garment_id = garment.id
      and listing.provider_name = 'Tô Hà Style'
);

insert into public.studio_marketplace_listings (
    item_type, garment_id, provider_name, listing_type, title,
    address, province, external_url, source_url, verified_at, sort_order
)
select
    'garment',
    garment.id,
    'Việt Phục Hoàng Thành',
    'rent',
    'Thuê ' || garment.name,
    'Khu di tích Hoàng thành Thăng Long',
    'Hà Nội',
    'https://vietphuchoangthanh.com/',
    'https://vietphuchoangthanh.com/',
    now(),
    3
from public.studio_garments as garment
where not exists (
    select 1
    from public.studio_marketplace_listings as listing
    where listing.garment_id = garment.id
      and listing.provider_name = 'Việt Phục Hoàng Thành'
);
