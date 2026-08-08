/**
 * @mentions dans les fils de discussion. Le rendu (liens) est côté client ; la
 * notification des mentionnés est faite par le trigger `notify_comment` (SQL),
 * de sorte que le même corps produit les mêmes destinataires quel que soit le
 * chemin d'écriture.
 */

const MENTION_RE = /@([a-z0-9_-]+)/gi;

/** Handles (minuscules, dédoublonnés) mentionnés dans un texte. */
export function extractMentions(body: string): string[] {
  const set = new Set<string>();
  for (const m of body.matchAll(MENTION_RE)) set.add(m[1].toLowerCase());
  return [...set];
}

export interface MentionToken {
  text: string;
  /** Handle (minuscule) si le token est une mention, sinon null. */
  handle: string | null;
}

/** Découpe un corps en tokens texte / mention pour le rendu. */
export function tokenizeMentions(body: string): MentionToken[] {
  return body
    .split(/(@[a-z0-9_-]+)/gi)
    .filter((p) => p !== "")
    .map((p) => {
      const m = /^@([a-z0-9_-]+)$/i.exec(p);
      return m ? { text: p, handle: m[1].toLowerCase() } : { text: p, handle: null };
    });
}

/**
 * Détecte un @token en cours de saisie juste avant le curseur (pour
 * l'auto-complétion). Renvoie la requête (sans @) et l'index de début du token.
 */
export function mentionQueryAtCaret(value: string, caret: number): { query: string; start: number } | null {
  const before = value.slice(0, caret);
  const m = /@([a-z0-9_-]*)$/i.exec(before);
  if (!m) return null;
  return { query: m[1].toLowerCase(), start: caret - m[0].length };
}
