import { fallbackCopy, type FallbackLookRequest } from './fallback-copy.ts';
import type { GeminiCopy } from './copy-schema.ts';

/** Free-form model copy cannot declare accessories the user never selected. */
export function selectionCopy(review: GeminiCopy, request: FallbackLookRequest, catalog: Record<string, any>): GeminiCopy {
  const selected = fallbackCopy(request, catalog);
  return { ...review, story: selected.story, guardrail: selected.guardrail, genZTip: selected.genZTip };
}
