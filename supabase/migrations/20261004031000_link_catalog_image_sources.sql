-- Publish the exact image references shown in Studio so users can distinguish
-- a visual catalog reference from the project's cultural interpretation.
insert into public.cultural_sources
    (title, source_url, license, curator_note, review_status)
select *
from (
    values
        (
            'Tư liệu ảnh áo ngũ thân, khoảng 1904',
            'https://commons.wikimedia.org/wiki/File:Ao_ngu_than_on_postcard_dated_1904.JPG',
            'Public domain',
            'Ảnh tham chiếu lịch sử cho catalog; không dùng thay cho hồ sơ phục dựng.',
            'published'
        ),
        (
            'Tư liệu ảnh áo tấc lụa Mã Châu',
            'https://commons.wikimedia.org/wiki/File:Rio_m%C3%A3_ch%C3%A2u_%C3%A1o_t%E1%BA%A5c.jpg',
            'CC BY-SA 4.0',
            'Ảnh tham chiếu trực quan cho dáng áo tấc trong catalog.',
            'published'
        ),
        (
            'Tư liệu ảnh áo Nhật Bình',
            'https://commons.wikimedia.org/wiki/File:Vietnamese_woman_wearing_%C3%81o_Nh%E1%BA%ADt_B%C3%ACnh.jpg',
            'CC BY-SA 4.0',
            'Ảnh lịch sử dùng để nhận diện mảng cổ và tỷ lệ trang phục.',
            'published'
        ),
        (
            'Tư liệu ảnh áo tứ thân',
            'https://commons.wikimedia.org/wiki/File:%C3%81o_t%E1%BB%A9_th%C3%A2n_1a.jpg',
            'CC BY-SA 3.0',
            'Ảnh tham chiếu trực quan cho lớp áo, yếm và tổng thể Bắc Bộ.',
            'published'
        )
) as source(title, source_url, license, curator_note, review_status)
where not exists (
    select 1
    from public.cultural_sources existing
    where existing.source_url = source.source_url
);

update public.studio_garments garment
set source_id = source.id
from public.cultural_sources source
where source.source_url = case garment.slug
    when 'ao-ngu-than-tay-chen' then 'https://commons.wikimedia.org/wiki/File:Ao_ngu_than_on_postcard_dated_1904.JPG'
    when 'ao-tac' then 'https://commons.wikimedia.org/wiki/File:Rio_m%C3%A3_ch%C3%A2u_%C3%A1o_t%E1%BA%A5c.jpg'
    when 'ao-nhat-binh' then 'https://commons.wikimedia.org/wiki/File:Vietnamese_woman_wearing_%C3%81o_Nh%E1%BA%ADt_B%C3%ACnh.jpg'
    when 'ao-tu-than' then 'https://commons.wikimedia.org/wiki/File:%C3%81o_t%E1%BB%A9_th%C3%A2n_1a.jpg'
    else ''
end;
