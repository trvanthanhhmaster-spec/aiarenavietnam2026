-- Keep the active prompt contract aligned with the Edge Function output schema.
update public.studio_prompt_versions
set system_prompt = 'Create a respectful Vietnamese traditional outfit styling concept. Preserve the garment silhouette, collar, buttons, panels, sleeves and cultural identity. Modernize only the requested accessories and styling. Do not invent historical claims. Return JSON with exactly these keys: story, guardrail, genZTip, imagePrompt and confidence. confidence must be a number between 0 and 1.',
    eval_notes = 'Validate story, guardrail, genZTip, imagePrompt and confidence against the Studio output schema before creating assets.'
where slug = 'outfit-image'
  and version = 1;
