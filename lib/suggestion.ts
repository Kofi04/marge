import type { SuggestionKind } from "@/lib/types";

/**
 * Seuil (en caractères) séparant une coquille d'une réécriture. Repris du
 * prototype : `Math.abs(text.length - block.text.length) < 25`.
 */
export const TYPO_THRESHOLD = 25;

/**
 * Détermine la nature d'une proposition. Une correction (`typo`) est un
 * changement de moins de 25 caractères ; au-delà, c'est une réécriture (`edit`)
 * qui exigera un motif et ouvrira un fil de discussion.
 *
 * Doit être calculé côté client (aperçu) ET revalidé côté serveur (l'API ne fait
 * pas confiance au `kind` envoyé).
 */
export function computeKind(originalText: string, proposedText: string): SuggestionKind {
  return Math.abs(proposedText.length - originalText.length) < TYPO_THRESHOLD ? "typo" : "edit";
}

/** Une proposition n'a de sens que si le texte proposé diffère de l'original. */
export function hasChanged(originalText: string, proposedText: string): boolean {
  return proposedText.trim() !== originalText.trim();
}
