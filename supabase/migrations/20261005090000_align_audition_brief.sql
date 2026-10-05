-- Align the live catalog and generation contract with the AI Arena Vietnam 2026
-- Audition brief. Presets remain editable JSON so Admin can extend contexts
-- without changing PHP or JavaScript.

update public.studio_events
set
    description = case slug
        when 'school' then 'Gợi ý nhanh cho lớp học, campus và nhịp đi học hằng ngày.'
        when 'street' then 'Bản phối Việt phục nhẹ nhõm cho phố cổ, cà phê và dạo phố.'
        when 'ceremony' then 'Bản phối trang trọng cho lễ tốt nghiệp, cưới hỏi và không gian di sản.'
        when 'portrait' then 'Bản phối có chủ đích cho kỷ yếu, lookbook và bộ ảnh cá nhân.'
        else description
    end,
    cultural_context = case slug
        when 'school' then 'Ưu tiên kín đáo, thoải mái, dễ vận động; phụ kiện hiện đại chỉ làm điểm nhấn.'
        when 'street' then 'Giữ phom và chi tiết nhận diện; không để phụ kiện đô thị che cấu trúc áo.'
        when 'ceremony' then 'Tôn trọng quy cách cài cúc, vạt áo, độ kín đáo và quy định nơi tổ chức.'
        when 'portrait' then 'Giữ bố cục và nhân vật ổn định để so sánh các phương án lookbook.'
        else cultural_context
    end,
    preset = case slug
        when 'school' then jsonb_build_object(
            'location', 'Campus Hà Nội', 'season', 'Mùa thu', 'weather', 'Trời mát, có nắng nhẹ',
            'audience', 'học sinh, sinh viên', 'garment', 'ao-ngu-than-tay-chen', 'color', 'indigo',
            'style', 'school-polished', 'scene', 'campus', 'suggestion', 'Sneaker trắng + túi tote'
        )
        when 'street' then jsonb_build_object(
            'location', 'Phố cổ Hà Nội', 'season', 'Mùa thu', 'weather', 'Khô ráo, ánh sáng dịu',
            'audience', 'người trẻ khám phá thành phố', 'garment', 'ao-tu-than', 'color', 'moss',
            'style', 'streetwear', 'scene', 'old-quarter', 'suggestion', 'Tote canvas + loafer'
        )
        when 'ceremony' then jsonb_build_object(
            'location', 'Văn Miếu – Quốc Tử Giám', 'season', 'Mùa thu', 'weather', 'Trời mát, ánh sáng tự nhiên',
            'audience', 'lễ tốt nghiệp, cưới hỏi, sự kiện văn hóa', 'garment', 'ao-tac', 'color', 'vermilion',
            'style', 'elegant', 'scene', 'temple', 'suggestion', 'Loafer + phụ kiện tiết chế'
        )
        when 'portrait' then jsonb_build_object(
            'location', 'Studio / Hoàng thành', 'season', 'Bốn mùa', 'weather', 'Ánh sáng được kiểm soát',
            'audience', 'kỷ yếu, lookbook, ảnh cá nhân', 'garment', 'ao-nhat-binh', 'color', 'ivory',
            'style', 'heritage-editorial', 'scene', 'studio', 'suggestion', 'Giữ nền sạch, ưu tiên chi tiết cổ áo'
        )
        else preset
    end,
    updated_at = now()
where slug in ('school', 'street', 'ceremony', 'portrait');

-- The brief requires a structured cultural score in every AI response.
update public.studio_prompt_versions
set
    system_prompt = 'Create a respectful Vietnamese traditional outfit styling concept for Gen Z. Preserve the garment silhouette, collar, buttons, panels, sleeves and cultural identity. Modernize only the requested accessories and styling. Use the approved catalog facts as the source of truth; do not invent historical claims. Return JSON with exactly these keys: story, guardrail, genZTip, culturalScore, imagePrompt and confidence. culturalScore must be a number from 0 to 100 and reflect cultural fit, not image quality. confidence must be a number between 0 and 1.',
    eval_notes = 'Validate story, guardrail, genZTip, imagePrompt, culturalScore and confidence. Check context, weather and event fit; warnings must be actionable and respectful.'
where slug = 'outfit-image' and version = 1;

update public.studio_generation_settings
set base_prompt = 'Ảnh gốc A: một nhân vật Việt mặc trang phục được chọn, đứng chính giữa, toàn thân, giữ cố định khuôn mặt, dáng đứng, góc máy và bố cục; ưu tiên 16:9 ở 1080p cho preview, sau đó có thể xuất lookbook 9:16.',
    updated_at = now()
where id = 1;

-- Approved guardrails used by the fallback path and by the Studio check panel.
insert into public.cultural_rules (garment_id, rule_text, severity, context, review_status)
select g.id, v.rule_text, v.severity, v.context, 'approved'
from public.studio_garments g
join (values
    ('ao-tac', 'Dự lễ nên giữ cổ áo, hàng cúc và tay áo đúng phom; phụ kiện chỉ nên làm điểm nhấn.', 'warning', 'ceremony'),
    ('ao-nhat-binh', 'Không dùng phụ kiện hoặc họa tiết hiện đại để che mảng cổ đặc trưng của Nhật Bình.', 'warning', 'all'),
    ('ao-tu-than', 'Khi phối hiện đại vẫn cần giữ mối liên hệ giữa áo, yếm và thắt lưng.', 'warning', 'all')
) as v(slug, rule_text, severity, context) on v.slug = g.slug
where not exists (
    select 1 from public.cultural_rules r
    where r.garment_id = g.id and r.rule_text = v.rule_text
);
