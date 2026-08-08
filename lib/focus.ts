/**
 * Portion précise d'un bloc visée par une suggestion (`focus_range`).
 *
 * L'ancre d'une suggestion reste le bloc entier (`original_text`) ; `focus_range`
 * indique en plus, en offsets de caractères dans `original_text`, la région
 * réellement touchée. On la dérive du diff mot à mot : c'est déterministe et sans
 * friction (pas de sélection manuelle à faire), et ça clarifie l'intention.
 */

import { diffWords } from "@/lib/diff";
import type { FocusRange } from "@/lib/types";

export type { FocusRange };

/**
 * Région de `original` couverte par les changements pour obtenir `proposed`.
 * Renvoie null si les textes sont identiques. Pour une insertion pure, renvoie
 * une plage de largeur nulle au point d'insertion.
 */
export function focusRangeFromDiff(original: string, proposed: string): FocusRange | null {
  if (original === proposed) return null;
  const parts = diffWords(original, proposed);

  let offset = 0; // position courante dans `original`
  let start = -1;
  let end = -1;
  const mark = (from: number, to: number) => {
    if (start === -1 || from < start) start = from;
    if (to > end) end = to;
  };

  for (const p of parts) {
    if (p.type === "same") {
      offset += p.value.length;
    } else if (p.type === "del") {
      mark(offset, offset + p.value.length);
      offset += p.value.length;
    } else {
      // Insertion : point sans avancer dans `original`.
      mark(offset, offset);
    }
  }

  if (start === -1) return null;
  return { start, end };
}

/**
 * Extrait lisible autour de la région visée, avec un peu de contexte de part et
 * d'autre. Une plage de largeur nulle est élargie au mot englobant. Préfixe/suffixe
 * tronqués par « … ». Utilisé pour afficher « porte sur : … ».
 */
export function focusExcerpt(original: string, range: FocusRange, pad = 24): string {
  let { start, end } = range;
  // Élargit une plage vide au mot qui l'entoure pour rester lisible.
  if (start === end) {
    while (start > 0 && !/\s/.test(original[start - 1])) start--;
    while (end < original.length && !/\s/.test(original[end])) end++;
  }
  const from = Math.max(0, start - pad);
  const to = Math.min(original.length, end + pad);
  const core = original.slice(from, to).trim();
  return `${from > 0 ? "… " : ""}${core}${to < original.length ? " …" : ""}`;
}
