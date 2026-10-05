-- Audition presets describe demo scenarios, not live weather/geolocation.
update public.studio_events
set preset = preset || jsonb_build_object(
    'context_source', 'demo-preset',
    'pattern', 'plain',
    'accessories', case slug
        when 'school' then '["sneaker-trang","tui-tote"]'::jsonb
        when 'street' then '["giay-loafer","tui-tote"]'::jsonb
        when 'ceremony' then '["giay-loafer"]'::jsonb
        else '[]'::jsonb end
), updated_at = now()
where slug in ('school', 'street', 'ceremony', 'portrait');

-- Fill generation descriptors without inventing fabric, dynasty or price.
update public.studio_garments g
set prompt_descriptor = v.prompt,
    negative_descriptor = 'Do not crop or cut garment panels, erase collar or buttons, invent insignia, or substitute generic East Asian clothing.',
    allowed_contexts = v.contexts::jsonb,
    default_colors = v.colors::jsonb,
    updated_at = now()
from (values
    ('ao-ngu-than-tay-chen', 'Vietnamese ao ngu than tay chen; preserve five-panel construction, fitted sleeves, collar and button line. Modern accessories must not conceal the garment.', '["school","street","ceremony","portrait"]', '["indigo","beige","ivory"]'),
    ('ao-tac', 'Vietnamese ao tac; preserve its formal silhouette, wide sleeves, collar, buttons and full-length panels. Style respectfully for the selected event.', '["ceremony","portrait"]', '["vermilion","ivory","deep-red"]'),
    ('ao-nhat-binh', 'Vietnamese ao Nhat Binh; preserve the distinctive collar panel and visible garment proportions in the approved reference. Do not invent court rank or royal insignia.', '["ceremony","portrait"]', '["ivory","deep-red","indigo"]'),
    ('ao-tu-than', 'Vietnamese ao tu than; preserve the relationship of the outer garment, yem and waist sash shown by the approved reference. Use restrained contemporary accessories.', '["street","portrait"]', '["moss","brown","beige"]')
) as v(slug, prompt, contexts, colors)
where g.slug = v.slug and g.prompt_descriptor = '';

update public.studio_accessories a
set prompt_descriptor = v.prompt, compatibility = v.compatibility::jsonb, updated_at = now()
from (values
    ('sneaker-trang', 'Low-profile white sneakers, practical and unbranded; keep garment panels visible.', '{"suggested_contexts":["school","street","portrait"],"styling_note":"Kiểm tra quy định giày dép của nơi tổ chức khi dự lễ."}'),
    ('giay-loafer', 'Simple loafers with a restrained silhouette and no visible brand logo.', '{"suggested_contexts":["school","street","ceremony","portrait"]}'),
    ('tui-tote', 'Practical tote bag carried at the side, not across the collar or button line.', '{"suggested_contexts":["school","street"],"styling_note":"Không để túi che hàng khuy và vạt áo."}'),
    ('kinh-ram', 'Minimal sunglasses as an optional outdoor fashion accent, not covering garment details.', '{"suggested_contexts":["street","portrait"],"styling_note":"Cân nhắc tháo kính trong không gian nghi lễ."}'),
    ('dong-ho-thong-minh', 'Discreet smartwatch visible at the wrist without obscuring sleeve construction.', '{"suggested_contexts":["school","street","portrait"]}')
) as v(slug, prompt, compatibility)
where a.slug = v.slug and a.prompt_descriptor = '';

update public.studio_garment_variants v
set prompt_descriptor = g.prompt_descriptor, negative_descriptor = g.negative_descriptor,
    updated_at = now()
from public.studio_garments g
where v.garment_id = g.id and v.source_provider = 'curated' and v.prompt_descriptor = '';

update public.studio_accessory_variants v
set prompt_descriptor = a.prompt_descriptor, updated_at = now()
from public.studio_accessories a
where v.accessory_id = a.id and v.source_provider = 'curated' and v.prompt_descriptor = '';

-- Version the new contract rather than silently changing historical job prompts.
update public.studio_prompt_versions set is_active = false where slug = 'outfit-image';
insert into public.studio_prompt_versions (slug, version, model, system_prompt, eval_notes, is_active)
values (
    'outfit-image', 2, 'gemini',
    'Act as a Gen Z stylist and cultural guide. Use only supplied approved catalog facts for historical statements. Preserve garment structure and explain in Vietnamese with 2-3 concise sentences for story. Respect user selections and locks. Context marked demo-preset is illustrative, not live weather. Return JSON with exactly story, guardrail, genZTip, culturalScore, imagePrompt, confidence. culturalScore is a tentative 0-100 assessment of the SELECTED styling against supplied rules, not expert certification and not an assessment of a generated image. Explain cautions and actionable corrections in guardrail. Never award cultural validity solely because a color or accessory is selected. confidence is 0-1; lower it when sources or rules are incomplete. imagePrompt must include concrete item descriptors, negative constraints, location, palette, accessories and locks; no invented historical claims, text, logo or watermark.',
    'Schema tests and 4x4 garment/event fallback cases. Null score on fallback; no fabricated live context; approved sources only. Live provider/image fidelity requires separate QA.',
    true
)
on conflict (slug, version) do update set
    system_prompt = excluded.system_prompt, eval_notes = excluded.eval_notes, is_active = true;
