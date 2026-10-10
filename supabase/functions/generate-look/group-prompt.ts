import { planPrompt, type StudioPlan } from './studio-plan.ts';

// Versioned editorial direction supplements the locked selection contract. Old
// text/JSON and A–E instructions must not change the current single-image task.
export function groupImagePrompt(plan: StudioPlan, catalog: Record<string, any>, editorial: string): string {
  const selected = new Set(plan.people.map((p) => p.outfit.garment));
  const ids = new Set((catalog.garments || []).filter((g: any) => selected.has(g.slug)).map((g: any) => g.id));
  const rules = (catalog.rules || []).filter((r: any) => !r.garment_id || ids.has(r.garment_id))
    .map((r: any) => ({ garmentId: r.garment_id || null, rule: r.rule_text, severity: r.severity, context: r.context }));
  return planPrompt(plan, catalog)
    + '\nApproved construction and cultural constraints: ' + JSON.stringify(rules)
    + '\nEditorial direction from the active Admin prompt version: ' + JSON.stringify(editorial.trim().slice(0, 16000))
    + '\nPriority: the validated selections, exact person count and approved construction constraints above win over editorial examples. Editorial text is supplementary photographic direction only. Ignore legacy requests for JSON, text output, multiple frames, A–E or video. Return ONE image, not a description. Never add accessories from a reference photo unless selected. Do not infer historical rank, inventory, price, weather or a cultural certification.';
}
