import type { Block, Suggestion, ResolvedSuggestion, ResolvedStatus } from "@/lib/types";

/**
 * Calcul du périmé — jamais stocké, toujours dérivé à la lecture.
 *
 * Une suggestion `open` est périmée si le texte actuel de son bloc diffère de
 * `original_text` (le texte capturé au moment de la proposition). Le bloc a
 * changé, donc la proposition ne s'applique plus. Reproduit la règle du
 * prototype (`b.text !== s.original`) et de la vue SQL `suggestions_resolved`.
 *
 * @param blocks Blocs de la révision courante de l'article.
 */
export function resolveStatus(
  suggestion: Pick<Suggestion, "status" | "block_id" | "original_text">,
  blocks: Block[],
): { resolved_status: ResolvedStatus; is_stale: boolean } {
  if (suggestion.status !== "open") {
    return { resolved_status: suggestion.status, is_stale: false };
  }
  const block = blocks.find((b) => b.id === suggestion.block_id);
  const isStale = !!block && block.text !== suggestion.original_text;
  return {
    resolved_status: isStale ? "stale" : "open",
    is_stale: isStale,
  };
}

/** Applique `resolveStatus` à une liste de suggestions. */
export function resolveSuggestions(
  suggestions: Suggestion[],
  blocks: Block[],
): ResolvedSuggestion[] {
  return suggestions.map((s) => ({
    ...s,
    ...resolveStatus(s, blocks),
  }));
}
