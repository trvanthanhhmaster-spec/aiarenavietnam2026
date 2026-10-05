-- Restore a small, reviewed Studio catalog after the intentional catalog wipe.
-- The rows below are editable seed content; Studio only reads active/published rows.

insert into public.studio_events (slug, label, description, cultural_context, sort_order, is_active)
values
    ('school', 'Đi học', 'Gọn gàng, linh hoạt và gần gũi cho nhịp sống học đường.', 'Ưu tiên kín đáo, thoải mái, dễ vận động; phụ kiện hiện đại chỉ làm điểm nhấn.', 1, true),
    ('street', 'Dạo phố', 'Bản phối Việt phục nhẹ nhõm cho phố cổ, cà phê và dạo phố.', 'Giữ phom và chi tiết nhận diện; không để phụ kiện đô thị che cấu trúc áo.', 2, true),
    ('ceremony', 'Dự lễ', 'Bản phối trang trọng cho lễ tốt nghiệp, cưới hỏi và không gian di sản.', 'Tôn trọng quy cách cài cúc, vạt áo, độ kín đáo và quy định nơi tổ chức.', 3, true),
    ('portrait', 'Chụp ảnh', 'Bản phối có chủ đích cho kỷ yếu, lookbook và bộ ảnh cá nhân.', 'Giữ bố cục và nhân vật ổn định để so sánh các phương án.', 4, true)
on conflict (slug) do update set
    label = excluded.label, description = excluded.description,
    cultural_context = excluded.cultural_context, sort_order = excluded.sort_order,
    is_active = true, updated_at = now();

update public.studio_events
set preset = case slug
    when 'school' then jsonb_build_object('location', 'Campus Hà Nội', 'season', 'Mùa thu', 'weather', 'Trời mát, có nắng nhẹ', 'audience', 'học sinh, sinh viên', 'garment', 'ao-ngu-than-tay-chen', 'color', 'indigo', 'style', 'school-polished', 'scene', 'campus', 'suggestion', 'Sneaker trắng + túi tote')
    when 'street' then jsonb_build_object('location', 'Phố cổ Hà Nội', 'season', 'Mùa thu', 'weather', 'Khô ráo, ánh sáng dịu', 'audience', 'người trẻ khám phá thành phố', 'garment', 'ao-tu-than', 'color', 'moss', 'style', 'streetwear', 'scene', 'old-quarter', 'suggestion', 'Tote canvas + loafer')
    when 'ceremony' then jsonb_build_object('location', 'Văn Miếu – Quốc Tử Giám', 'season', 'Mùa thu', 'weather', 'Trời mát, ánh sáng tự nhiên', 'audience', 'lễ tốt nghiệp, cưới hỏi, sự kiện văn hóa', 'garment', 'ao-tac', 'color', 'vermilion', 'style', 'elegant', 'scene', 'temple', 'suggestion', 'Loafer + phụ kiện tiết chế')
    when 'portrait' then jsonb_build_object('location', 'Studio / Hoàng thành', 'season', 'Bốn mùa', 'weather', 'Ánh sáng được kiểm soát', 'audience', 'kỷ yếu, lookbook, ảnh cá nhân', 'garment', 'ao-nhat-binh', 'color', 'ivory', 'style', 'heritage-editorial', 'scene', 'studio', 'suggestion', 'Giữ nền sạch, ưu tiên chi tiết cổ áo')
    else preset
end || jsonb_build_object('context_source', 'curated-demo'), updated_at = now()
where slug in ('school', 'street', 'ceremony', 'portrait');

insert into public.cultural_sources (title, source_url, license, curator_note, review_status)
select source.title, source.source_url, source.license, source.curator_note, 'published'
from (values
    ('Tư liệu ảnh áo ngũ thân, khoảng 1904', 'https://commons.wikimedia.org/wiki/File:Ao_ngu_than_on_postcard_dated_1904.JPG', 'Public domain', 'Ảnh tham chiếu lịch sử cho catalog; không dùng thay cho hồ sơ phục dựng.'),
    ('Tư liệu ảnh áo tấc lụa Mã Châu', 'https://commons.wikimedia.org/wiki/File:Rio_m%C3%A3_ch%C3%A2u_%C3%A1o_t%E1%BA%A5c.jpg', 'CC BY-SA 4.0', 'Ảnh tham chiếu trực quan cho dáng áo tấc trong catalog.'),
    ('Tư liệu ảnh áo Nhật Bình', 'https://commons.wikimedia.org/wiki/File:Vietnamese_woman_wearing_%C3%81o_Nh%E1%BA%ADt_B%C3%ACnh.jpg', 'CC BY-SA 4.0', 'Ảnh dùng để nhận diện mảng cổ và tỷ lệ trang phục.'),
    ('Tư liệu ảnh áo tứ thân', 'https://commons.wikimedia.org/wiki/File:%C3%81o_t%E1%BB%A9_th%C3%A2n_1a.jpg', 'CC BY-SA 3.0', 'Ảnh tham chiếu cho lớp áo, yếm và tổng thể Bắc Bộ.')
) as source(title, source_url, license, curator_note)
where not exists (select 1 from public.cultural_sources existing where existing.source_url = source.source_url);

insert into public.studio_garments (
    slug, name, category, description, origin_note, significance_note,
    image_url, thumbnail_url, prompt_descriptor, negative_descriptor,
    allowed_contexts, default_colors, sort_order, is_active
)
values
    ('ao-ngu-than-tay-chen', 'Áo ngũ thân tay chẽn', 'Áo ngũ thân', 'Phom áo năm thân với tay chẽn gọn, phù hợp cách phối đương đại.', 'Dòng áo cổ truyền gắn với hệ trang phục Việt qua nhiều thời kỳ.', 'Giữ rõ năm thân, cổ áo và hàng khuy khi phối hiện đại.', 'assets/media/catalog/garment-ao-ngu-than.webp', 'assets/media/catalog/garment-ao-ngu-than.webp', 'Vietnamese ao ngu than tay chen; preserve five-panel construction, fitted sleeves, collar and button line.', 'Do not crop panels, erase the collar or button line, invent insignia, or substitute generic East Asian clothing.', '["school","street","ceremony","portrait"]'::jsonb, '["indigo","beige","ivory"]'::jsonb, 1, true),
    ('ao-tac', 'Áo tấc', 'Áo ngũ thân', 'Dáng áo trang trọng, tay rộng và phù hợp bối cảnh lễ nghi.', 'Một biến thể trang phục lễ phục truyền thống.', 'Giữ tỷ lệ, cổ áo, tay rộng và cách cài đúng khi mô tả.', 'assets/media/catalog/garment-ao-tac.webp', 'assets/media/catalog/garment-ao-tac.webp', 'Vietnamese ao tac; preserve its formal silhouette, wide sleeves, collar, buttons and full-length panels.', 'Do not shorten sleeves, replace the collar, add invented rank symbols, or expose the torso.', '["ceremony","portrait"]'::jsonb, '["vermilion","ivory","deep-red"]'::jsonb, 2, true),
    ('ao-nhat-binh', 'Áo Nhật Bình', 'Áo cung đình', 'Áo có mảng cổ đặc trưng, tạo hình rõ nét cho ảnh chân dung.', 'Gắn với phục sức cung đình triều Nguyễn.', 'Không giản lược mảng cổ nhận diện thành họa tiết trang trí chung chung.', 'assets/media/catalog/garment-ao-nhat-binh.webp', 'assets/media/catalog/garment-ao-nhat-binh.webp', 'Vietnamese ao Nhat Binh; preserve the distinctive collar panel and approved garment proportions.', 'Do not invent court rank, royal insignia, or remove the distinctive collar panel.', '["ceremony","portrait"]'::jsonb, '["ivory","deep-red","indigo"]'::jsonb, 3, true),
    ('ao-tu-than', 'Áo tứ thân', 'Áo Bắc Bộ', 'Lớp áo mềm, tạo chuyển động tốt khi phối cùng phụ kiện hiện đại.', 'Gắn với hình ảnh phụ nữ vùng đồng bằng Bắc Bộ.', 'Giữ mối liên hệ giữa áo, yếm, thắt lưng và hoàn cảnh mặc.', 'assets/media/catalog/garment-ao-tu-than.webp', 'assets/media/catalog/garment-ao-tu-than.webp', 'Vietnamese ao tu than; preserve the relationship of the outer garment, yem and waist sash.', 'Do not remove the sash or yem relationship, over-modernize the silhouette, or add unrelated costume details.', '["street","portrait"]'::jsonb, '["moss","brown","beige"]'::jsonb, 4, true)
on conflict (slug) do update set
    name = excluded.name, category = excluded.category, description = excluded.description,
    origin_note = excluded.origin_note, significance_note = excluded.significance_note,
    image_url = excluded.image_url, thumbnail_url = excluded.thumbnail_url,
    prompt_descriptor = excluded.prompt_descriptor, negative_descriptor = excluded.negative_descriptor,
    allowed_contexts = excluded.allowed_contexts, default_colors = excluded.default_colors,
    sort_order = excluded.sort_order, is_active = true, updated_at = now();

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

insert into public.studio_accessories (slug, name, category, description, image_url, thumbnail_url, prompt_descriptor, compatibility, sort_order, is_active)
values
    ('sneaker-trang', 'Sneaker trắng', 'Giày', 'Tạo nhịp trẻ và dễ vận động cho phối đồ hằng ngày.', 'assets/media/catalog/accessory-sneaker-trang.webp', 'assets/media/catalog/accessory-sneaker-trang.webp', 'Low-profile white sneakers, practical and unbranded; keep garment panels visible.', '{"suggested_contexts":["school","street","portrait"]}'::jsonb, 1, true),
    ('giay-loafer', 'Giày loafer', 'Giày', 'Giữ cảm giác gọn gàng, lịch sự nhưng không quá nghi lễ.', 'assets/media/catalog/accessory-giay-loafer.webp', 'assets/media/catalog/accessory-giay-loafer.webp', 'Simple loafers with a restrained silhouette and no visible brand logo.', '{"suggested_contexts":["school","street","ceremony","portrait"]}'::jsonb, 2, true),
    ('tui-tote', 'Túi tote', 'Túi', 'Tăng tính thực dụng cho bối cảnh học đường và đô thị.', 'assets/media/catalog/accessory-tui-tote.webp', 'assets/media/catalog/accessory-tui-tote.webp', 'Practical canvas tote carried at the side, never across the collar or button line.', '{"suggested_contexts":["school","street"],"styling_note":"Không để túi che hàng khuy và vạt áo."}'::jsonb, 3, true),
    ('kinh-ram', 'Kính râm', 'Phụ kiện', 'Tạo điểm nhấn thời trang cho bộ ảnh ngoài trời.', 'assets/media/catalog/accessory-kinh-ram.webp', 'assets/media/catalog/accessory-kinh-ram.webp', 'Minimal sunglasses as an optional outdoor accent, not covering garment details.', '{"suggested_contexts":["street","portrait"],"styling_note":"Cân nhắc tháo kính trong không gian nghi lễ."}'::jsonb, 4, true),
    ('dong-ho-thong-minh', 'Đồng hồ thông minh', 'Phụ kiện', 'Một chi tiết công nghệ tiết chế trong tổng thể truyền thống.', 'assets/media/catalog/accessory-dong-ho.webp', 'assets/media/catalog/accessory-dong-ho.webp', 'Discreet smartwatch visible at the wrist without obscuring sleeve construction.', '{"suggested_contexts":["school","street","portrait"]}'::jsonb, 5, true)
on conflict (slug) do update set
    name = excluded.name, category = excluded.category, description = excluded.description,
    image_url = excluded.image_url, thumbnail_url = excluded.thumbnail_url,
    prompt_descriptor = excluded.prompt_descriptor, compatibility = excluded.compatibility,
    sort_order = excluded.sort_order, is_active = true, updated_at = now();

insert into public.studio_options (option_type, slug, label, value, prompt_hint, sort_order, is_active)
values
    ('color', 'indigo', 'Chàm lam', '#243652', 'deep indigo blue with restrained contrast', 1, true),
    ('color', 'ivory', 'Ngà ấm', '#e8ddc9', 'warm ivory with natural textile texture', 2, true),
    ('color', 'vermilion', 'Đỏ son', '#9e3f36', 'muted vermilion accent, never neon', 3, true),
    ('color', 'beige', 'Beige', '#c5aa88', 'warm natural beige textile', 4, true),
    ('color', 'brown', 'Nâu', '#604a3e', 'deep earthy brown', 5, true),
    ('color', 'moss', 'Xanh rêu', '#596653', 'muted moss green', 6, true),
    ('color', 'deep-red', 'Đỏ trầm', '#713b36', 'restrained deep red', 7, true),
    ('color', 'white', 'Trắng', '#f4f0e7', 'soft textile white', 8, true),
    ('style', 'minimal', 'Tối giản', 'minimal', 'clean silhouette and one modern accent', 1, true),
    ('style', 'school-polished', 'Học đường', 'school polished', 'youthful, neat and practical', 2, true),
    ('style', 'elegant', 'Thanh lịch', 'elegant', 'refined styling with restrained accessories', 3, true),
    ('style', 'streetwear', 'Streetwear', 'streetwear', 'urban styling without hiding garment structure', 4, true),
    ('style', 'heritage-editorial', 'Biên tập di sản', 'heritage editorial', 'editorial composition, visible craft details', 5, true),
    ('style', 'vintage', 'Vintage', 'vintage', 'period-inspired editorial styling', 6, true),
    ('style', 'active', 'Năng động', 'active', 'comfortable movement and lightweight accessories', 7, true),
    ('pattern', 'plain', 'Trơn', 'plain', 'solid textile with visible weave', 1, true),
    ('pattern', 'cloud', 'Vân mây', 'cloud', 'restrained traditional cloud motif', 2, true),
    ('pattern', 'lotus', 'Hoa sen', 'lotus', 'small-scale lotus motif', 3, true),
    ('scene', 'campus', 'Trường học', 'campus', 'Vietnamese university campus', 1, true),
    ('scene', 'old-quarter', 'Phố cổ', 'old quarter', 'Hanoi old quarter streetscape', 2, true),
    ('scene', 'temple', 'Văn Miếu', 'temple', 'Temple of Literature courtyard', 3, true),
    ('scene', 'citadel', 'Hoàng thành', 'citadel', 'Imperial Citadel of Thang Long', 4, true),
    ('scene', 'studio', 'Studio', 'studio', 'editorial daylight studio', 5, true),
    ('scene', 'ceremonial-space', 'Không gian lễ nghi', 'ceremonial space', 'respectful Vietnamese ceremonial setting', 6, true)
on conflict (option_type, slug) do update set
    label = excluded.label, value = excluded.value, prompt_hint = excluded.prompt_hint,
    sort_order = excluded.sort_order, is_active = true;

insert into public.studio_garment_variants (
    garment_id, slug, name, description, silhouette, material, pattern_notes,
    color_palette, image_url, thumbnail_url, prompt_descriptor, negative_descriptor,
    source_id, source_url, source_provider, review_status, sort_order, is_active
)
select g.id, v.slug, v.name, v.description, v.silhouette, v.material, v.pattern_notes,
    v.color_palette::jsonb, v.image_url, v.image_url, v.prompt_descriptor, g.negative_descriptor,
    g.source_id, s.source_url, 'curated', 'published', v.sort_order, true
from public.studio_garments g
join (values
    ('ao-ngu-than-tay-chen', 'ao-ngu-than-tay-chen-indigo', 'Tay chẽn chàm lam', 'Bản phối chàm lam gọn gàng, giữ rõ cổ và hàng khuy.', 'Tay chẽn gọn, thân áo năm mảnh', 'Vải dệt matte', 'Trơn, nhấn bề mặt vải', '["indigo","ivory"]', 'assets/media/catalog/garment-ao-ngu-than.webp', 'Giữ phom tay chẽn và hàng khuy; màu chàm lam tiết chế.', 1),
    ('ao-tac', 'ao-tac-do-son', 'Áo tấc đỏ son', 'Bản phối trang trọng với tay rộng và sắc đỏ son trầm.', 'Tay rộng, thân dài, cổ đứng', 'Lụa hoặc vải dệt có độ rủ', 'Trơn, tập trung vào phom', '["vermilion","ivory"]', 'assets/media/catalog/garment-ao-tac.webp', 'Giữ tỷ lệ lễ phục và tay rộng; đỏ son không neon.', 1),
    ('ao-nhat-binh', 'ao-nhat-binh-ngam', 'Nhật Bình ngà ấm', 'Bản phối chân dung làm nổi mảng cổ đặc trưng.', 'Mảng cổ lớn, thân áo cân đối', 'Vải dệt có bề mặt mịn', 'Hoa văn tiết chế, không thêm cấp bậc', '["ivory","deep-red"]', 'assets/media/catalog/garment-ao-nhat-binh.webp', 'Giữ nguyên mảng cổ Nhật Bình và tỷ lệ thân áo.', 1),
    ('ao-tu-than', 'ao-tu-than-xanh-reu', 'Tứ thân xanh rêu', 'Bản phối đời thường có chuyển động mềm cho ảnh phố.', 'Lớp áo mở, yếm và thắt lưng rõ', 'Vải mềm có chuyển động', 'Trơn hoặc họa tiết nhỏ', '["moss","beige","brown"]', 'assets/media/catalog/garment-ao-tu-than.webp', 'Giữ mối liên hệ áo, yếm và thắt lưng; phụ kiện không che vạt.', 1)
) as v(parent_slug, slug, name, description, silhouette, material, pattern_notes, color_palette, image_url, prompt_descriptor, sort_order)
    on v.parent_slug = g.slug
left join public.cultural_sources s on s.id = g.source_id
on conflict (slug) do update set
    name = excluded.name, description = excluded.description, silhouette = excluded.silhouette,
    material = excluded.material, pattern_notes = excluded.pattern_notes, color_palette = excluded.color_palette,
    image_url = excluded.image_url, thumbnail_url = excluded.thumbnail_url,
    prompt_descriptor = excluded.prompt_descriptor, source_id = excluded.source_id, source_url = excluded.source_url,
    review_status = 'published', is_active = true, updated_at = now();

insert into public.studio_accessory_variants (
    accessory_id, slug, name, description, material, color_palette, image_url, thumbnail_url,
    prompt_descriptor, source_provider, review_status, sort_order, is_active
)
select a.id, v.slug, v.name, v.description, v.material, v.color_palette::jsonb,
    v.image_url, v.image_url, a.prompt_descriptor, 'curated', 'published', 1, true
from public.studio_accessories a
join (values
    ('sneaker-trang', 'sneaker-trang-co-ban', 'Sneaker trắng tối giản', 'Đế thấp, dễ vận động và không che vạt áo.', 'Da canvas trắng', '["white"]', 'assets/media/catalog/accessory-sneaker-trang.webp'),
    ('giay-loafer', 'loafer-da-nau', 'Loafer da nâu', 'Một điểm nhấn lịch sự cho bản phối dạo phố hoặc dự lễ.', 'Da nâu trầm', '["brown"]', 'assets/media/catalog/accessory-giay-loafer.webp'),
    ('tui-tote', 'tote-canvas-be', 'Tote canvas be', 'Túi vải thực dụng, đeo ở cạnh người để không che hàng khuy.', 'Canvas be', '["beige"]', 'assets/media/catalog/accessory-tui-tote.webp'),
    ('kinh-ram', 'kinh-ram-gong-nau', 'Kính râm gọng nâu', 'Chỉ dùng như điểm nhấn ngoài trời, không che chi tiết áo.', 'Gọng acetate nâu', '["brown"]', 'assets/media/catalog/accessory-kinh-ram.webp'),
    ('dong-ho-thong-minh', 'dong-ho-day-den', 'Đồng hồ dây đen', 'Chi tiết công nghệ nhỏ gọn, giữ gọn cổ tay áo.', 'Dây silicone đen', '["black"]', 'assets/media/catalog/accessory-dong-ho.webp')
) as v(parent_slug, slug, name, description, material, color_palette, image_url)
    on v.parent_slug = a.slug
on conflict (slug) do update set
    name = excluded.name, description = excluded.description, material = excluded.material,
    color_palette = excluded.color_palette, image_url = excluded.image_url, thumbnail_url = excluded.thumbnail_url,
    prompt_descriptor = excluded.prompt_descriptor, review_status = 'published', is_active = true, updated_at = now();

insert into public.cultural_rules (garment_id, rule_text, severity, context, review_status, is_active)
select g.id, r.rule_text, 'warning', r.context, 'approved', true
from public.studio_garments g
join (values
    ('ao-ngu-than-tay-chen', 'Không để phụ kiện che hàng khuy chính hoặc làm mất cấu trúc năm thân.', 'all'),
    ('ao-tac', 'Dự lễ nên giữ cổ áo, hàng cúc và tay áo đúng phom; phụ kiện chỉ nên làm điểm nhấn.', 'ceremony'),
    ('ao-nhat-binh', 'Không dùng phụ kiện hoặc họa tiết hiện đại để che mảng cổ đặc trưng của Nhật Bình.', 'all'),
    ('ao-tu-than', 'Khi phối hiện đại vẫn cần giữ mối liên hệ giữa áo, yếm và thắt lưng.', 'all')
) as r(slug, rule_text, context) on r.slug = g.slug
where not exists (select 1 from public.cultural_rules old where old.garment_id = g.id and old.rule_text = r.rule_text);

insert into public.studio_locations (slug, name, address, province, latitude, longitude, map_url, description, image_url, suitable_contexts, source_url, sort_order, is_active)
values
    ('van-mieu-quoc-tu-giam', 'Văn Miếu – Quốc Tử Giám', '58 Quốc Tử Giám, Đống Đa', 'Hà Nội', 21.0242336, 105.8410067, 'https://www.google.com/maps/search/?api=1&query=V%C4%83n+Mi%E1%BA%BFu+Qu%E1%BB%91c+T%E1%BB%AD+Gi%C3%A1m+H%C3%A0+N%E1%BB%99i', 'Không gian di sản hợp ảnh chân dung và bản phối dự lễ. Kiểm tra quy định chụp ảnh trước khi đến.', 'assets/media/catalog/scene-van-mieu.webp', '["ceremony","portrait"]'::jsonb, 'https://www.openstreetmap.org/node/10591743723', 1, true),
    ('hoang-thanh-thang-long', 'Hoàng thành Thăng Long', '19C Hoàng Diệu, Ba Đình', 'Hà Nội', 21.0362620, 105.8402826, 'https://www.google.com/maps/search/?api=1&query=Ho%C3%A0ng+th%C3%A0nh+Th%C4%83ng+Long+H%C3%A0+N%E1%BB%99i', 'Bối cảnh thành cổ có nhịp kiến trúc rõ, hợp ảnh di sản và editorial.', 'assets/media/catalog/scene-citadel.webp', '["ceremony","portrait","street"]'::jsonb, 'https://www.openstreetmap.org/relation/21425205', 2, true),
    ('pho-co-ha-noi', 'Phố cổ Hà Nội', 'Khu phố cổ, Hoàn Kiếm', 'Hà Nội', 21.0340, 105.8500, 'https://www.google.com/maps/search/?api=1&query=Ph%E1%BB%91+c%E1%BB%95+H%C3%A0+N%E1%BB%99i', 'Nhịp phố đời thường cho bản phối dạo phố; ưu tiên góc chụp không cản trở lối đi.', 'assets/media/catalog/scene-old-quarter.webp', '["street","portrait"]'::jsonb, 'https://www.openstreetmap.org/search?query=Old%20Quarter%20Hanoi', 3, true)
on conflict (slug) do update set
    name = excluded.name, address = excluded.address, province = excluded.province,
    latitude = excluded.latitude, longitude = excluded.longitude, map_url = excluded.map_url,
    description = excluded.description, image_url = excluded.image_url, suitable_contexts = excluded.suitable_contexts,
    source_url = excluded.source_url, sort_order = excluded.sort_order, is_active = true, updated_at = now();

insert into public.studio_marketplace_listings (item_type, garment_id, provider_name, listing_type, title, address, province, external_url, source_url, verified_at, sort_order, is_active)
select 'garment', g.id, 'V''style – Việt Cổ Phục', 'both', 'Xem danh mục ' || g.name, 'SN 3B, ngõ 94 Hoàng Ngân, Cầu Giấy', 'Hà Nội', 'https://vietphuc.net/trang-phuc-cho-thue', 'https://vietphuc.net/', now(), 1, true
from public.studio_garments g
where not exists (select 1 from public.studio_marketplace_listings l where l.garment_id = g.id and l.provider_name = 'V''style – Việt Cổ Phục');

insert into public.studio_marketplace_listings (item_type, accessory_id, provider_name, listing_type, title, province, external_url, source_url, verified_at, sort_order, is_active)
select 'accessory', a.id, 'V-Remix partner catalog', 'buy', 'Tham khảo ' || a.name, 'Hà Nội', 'https://www.google.com/search?q=' || replace(a.name, ' ', '+'), 'https://www.google.com/', now(), 2, true
from public.studio_accessories a
where not exists (select 1 from public.studio_marketplace_listings l where l.accessory_id = a.id and l.provider_name = 'V-Remix partner catalog');
