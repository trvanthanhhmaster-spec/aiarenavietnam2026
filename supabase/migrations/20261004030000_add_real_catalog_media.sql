-- Real, licensed catalog references stored with the application so Studio does
-- not depend on third-party hotlinks. See assets/media/catalog/CREDITS.md.
alter table public.studio_options
    add column if not exists description text not null default '',
    add column if not exists thumbnail_url text,
    add column if not exists source_url text;

update public.studio_garments
set thumbnail_url = case slug
        when 'ao-ngu-than-tay-chen' then 'assets/media/catalog/garment-ao-ngu-than.webp'
        when 'ao-tac' then 'assets/media/catalog/garment-ao-tac.webp'
        when 'ao-nhat-binh' then 'assets/media/catalog/garment-ao-nhat-binh.webp'
        when 'ao-tu-than' then 'assets/media/catalog/garment-ao-tu-than.webp'
        else thumbnail_url
    end,
    image_url = case slug
        when 'ao-ngu-than-tay-chen' then 'assets/media/catalog/garment-ao-ngu-than.webp'
        when 'ao-tac' then 'assets/media/catalog/garment-ao-tac.webp'
        when 'ao-nhat-binh' then 'assets/media/catalog/garment-ao-nhat-binh.webp'
        when 'ao-tu-than' then 'assets/media/catalog/garment-ao-tu-than.webp'
        else image_url
    end
where slug in ('ao-ngu-than-tay-chen', 'ao-tac', 'ao-nhat-binh', 'ao-tu-than');

update public.studio_accessories
set thumbnail_url = case slug
        when 'sneaker-trang' then 'assets/media/catalog/accessory-sneaker-trang.webp'
        when 'giay-loafer' then 'assets/media/catalog/accessory-giay-loafer.webp'
        when 'tui-tote' then 'assets/media/catalog/accessory-tui-tote.webp'
        when 'kinh-ram' then 'assets/media/catalog/accessory-kinh-ram.webp'
        when 'dong-ho-thong-minh' then 'assets/media/catalog/accessory-dong-ho.webp'
        else thumbnail_url
    end,
    image_url = case slug
        when 'sneaker-trang' then 'assets/media/catalog/accessory-sneaker-trang.webp'
        when 'giay-loafer' then 'assets/media/catalog/accessory-giay-loafer.webp'
        when 'tui-tote' then 'assets/media/catalog/accessory-tui-tote.webp'
        when 'kinh-ram' then 'assets/media/catalog/accessory-kinh-ram.webp'
        when 'dong-ho-thong-minh' then 'assets/media/catalog/accessory-dong-ho.webp'
        else image_url
    end
where slug in ('sneaker-trang', 'giay-loafer', 'tui-tote', 'kinh-ram', 'dong-ho-thong-minh');

update public.studio_options
set description = case
        when option_type = 'color' and slug = 'indigo' then 'Sắc chàm sâu, phù hợp bản phối học đường và tối giản.'
        when option_type = 'color' and slug = 'ivory' then 'Sắc ngà ấm giúp bề mặt vải trông nhẹ và thanh lịch.'
        when option_type = 'color' and slug = 'vermilion' then 'Đỏ son tiết chế, tạo điểm nhấn cho dịp lễ và chân dung.'
        when option_type = 'color' and slug = 'beige' then 'Beige tự nhiên, dễ đi cùng phụ kiện da và canvas.'
        when option_type = 'color' and slug = 'brown' then 'Nâu đất trầm, hợp tinh thần di sản và ảnh ngoài trời.'
        when option_type = 'color' and slug = 'moss' then 'Xanh rêu dịu, cân bằng nét cổ truyền với nhịp phố.'
        when option_type = 'color' and slug = 'deep-red' then 'Đỏ trầm có chiều sâu, tránh cảm giác quá rực.'
        when option_type = 'color' and slug = 'white' then 'Trắng vải mềm, dùng làm nền sáng hoặc lớp trong.'
        when option_type = 'color' and slug = 'black' then 'Đen mềm, tạo tương phản nhưng vẫn giữ chi tiết phom.'
        when option_type = 'pattern' and slug = 'plain' then 'Bề mặt trơn để tập trung vào phom, khuy và cấu trúc áo.'
        when option_type = 'pattern' and slug = 'cloud' then 'Vân mây cỡ nhỏ dùng như tham chiếu thị giác, không thay thế tư liệu phục dựng.'
        when option_type = 'pattern' and slug = 'lotus' then 'Mô-típ sen tham chiếu từ hiện vật gốm Việt, cần dùng tiết chế trên vải.'
        when option_type = 'style' and slug = 'quiet-modern' then 'Phom sạch, màu lặng và một điểm nhấn hiện đại.'
        when option_type = 'style' and slug = 'heritage-editorial' then 'Nhấn chất liệu, cấu trúc áo và ánh sáng biên tập.'
        when option_type = 'style' and slug = 'street-soft' then 'Nhịp phố mềm, phụ kiện trẻ nhưng không che nhận diện áo.'
        when option_type = 'style' and slug = 'minimal' then 'Giảm phụ kiện và giữ khoảng thở cho tổng thể.'
        when option_type = 'style' and slug = 'school-polished' then 'Gọn, linh hoạt và chỉn chu cho môi trường học đường.'
        when option_type = 'style' and slug = 'elegant' then 'Tỷ lệ thanh lịch, phụ kiện tiết chế và ánh sáng dịu.'
        when option_type = 'style' and slug = 'streetwear' then 'Phối đô thị có nhịp mạnh nhưng vẫn giữ cấu trúc Việt phục.'
        when option_type = 'style' and slug = 'vintage' then 'Màu phim và cách tạo dáng gợi tư liệu ảnh xưa.'
        when option_type = 'style' and slug = 'active' then 'Ưu tiên chuyển động, giày nhẹ và phụ kiện thực dụng.'
        when option_type = 'scene' and slug = 'campus' then 'Khuôn viên đại học Việt Nam, hợp look đi học và walking shot.'
        when option_type = 'scene' and slug = 'old-quarter' then 'Phố cổ Hà Nội có chiều sâu kiến trúc và nhịp sống thật.'
        when option_type = 'scene' and slug = 'temple' then 'Sân Văn Miếu; cần giữ trang phục chỉnh tề và tôn trọng nội quy.'
        when option_type = 'scene' and slug = 'citadel' then 'Hoàng thành Thăng Long, phù hợp ảnh di sản và editorial.'
        when option_type = 'scene' and slug = 'studio' then 'Studio ánh sáng kiểm soát, tập trung vào phom và chất liệu.'
        when option_type = 'scene' and slug = 'ceremonial-space' then 'Không gian lễ nghi tham chiếu, ưu tiên bố cục trang trọng.'
        else description
    end,
    thumbnail_url = case
        when option_type = 'pattern' and slug = 'plain' then 'assets/media/catalog/pattern-plain.webp'
        when option_type = 'pattern' and slug = 'cloud' then 'assets/media/catalog/pattern-cloud.webp'
        when option_type = 'pattern' and slug = 'lotus' then 'assets/media/catalog/pattern-lotus.webp'
        when option_type = 'style' and slug in ('quiet-modern', 'minimal') then 'assets/media/catalog/scene-studio.webp'
        when option_type = 'style' and slug = 'heritage-editorial' then 'assets/media/catalog/garment-ao-nhat-binh.webp'
        when option_type = 'style' and slug in ('street-soft', 'streetwear') then 'assets/media/catalog/scene-old-quarter.webp'
        when option_type = 'style' and slug in ('school-polished', 'active') then 'assets/media/catalog/scene-campus.webp'
        when option_type = 'style' and slug = 'elegant' then 'assets/media/catalog/garment-ao-tac.webp'
        when option_type = 'style' and slug = 'vintage' then 'assets/media/catalog/garment-ao-ngu-than.webp'
        when option_type = 'scene' and slug = 'campus' then 'assets/media/catalog/scene-campus.webp'
        when option_type = 'scene' and slug = 'old-quarter' then 'assets/media/catalog/scene-old-quarter.webp'
        when option_type = 'scene' and slug = 'temple' then 'assets/media/catalog/scene-van-mieu.webp'
        when option_type = 'scene' and slug = 'citadel' then 'assets/media/catalog/scene-citadel.webp'
        when option_type = 'scene' and slug = 'studio' then 'assets/media/catalog/scene-studio.webp'
        when option_type = 'scene' and slug = 'ceremonial-space' then 'assets/media/catalog/scene-van-mieu.webp'
        else thumbnail_url
    end,
    source_url = case
        when option_type = 'pattern' and slug = 'plain' then 'https://commons.wikimedia.org/wiki/File:Gfp-golden-chinese-fabric-texture.jpg'
        when option_type = 'pattern' and slug = 'cloud' then 'https://commons.wikimedia.org/wiki/File:Textile_Fragment_(Japan),_19th_century_(CH_18567527).jpg'
        when option_type = 'pattern' and slug = 'lotus' then 'https://commons.wikimedia.org/wiki/File:National_Museum_Vietnamese_History_29_(cropped).jpg'
        when option_type = 'scene' and slug = 'campus' then 'https://commons.wikimedia.org/wiki/File:RMIT_University_Vietnam_-_Campus.JPG'
        when option_type = 'scene' and slug = 'old-quarter' then 'https://commons.wikimedia.org/wiki/File:Old_Quarter_street_scene,_Hanoi_(1)_(38464672752).jpg'
        when option_type = 'scene' and slug in ('temple', 'ceremonial-space') then 'https://commons.wikimedia.org/wiki/File:Văn_Miếu,_Đống_Đa,_Hà_Nội,_Vietnam_-_panoramio.jpg'
        when option_type = 'scene' and slug = 'citadel' then 'https://commons.wikimedia.org/wiki/File:Central_Sector_of_the_Imperial_Citadel_of_Thang_Long_-_Hanoi.jpg'
        when option_type = 'scene' and slug = 'studio' then 'https://commons.wikimedia.org/wiki/File:Tokiwadai_Photo_Studio_2F_Interior.jpg'
        else source_url
    end
where option_type in ('color', 'pattern', 'style', 'scene');

update public.studio_locations
set image_url = case slug
        when 'van-mieu-quoc-tu-giam' then 'assets/media/catalog/scene-van-mieu.webp'
        when 'hoang-thanh-thang-long' then 'assets/media/catalog/scene-citadel.webp'
        when 'pho-co-ha-noi' then 'assets/media/catalog/scene-old-quarter.webp'
        else image_url
    end
where slug in ('van-mieu-quoc-tu-giam', 'hoang-thanh-thang-long', 'pho-co-ha-noi');
