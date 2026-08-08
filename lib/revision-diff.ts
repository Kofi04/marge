/**
 * Comparaison de deux révisions d'un article, bloc par bloc.
 *
 * Cœur produit : l'unité de contribution est le bloc. On apparie les blocs de
 * deux révisions par leur `id` stable (qui survit aux révisions), puis on
 * calcule le diff mot à mot du seul texte modifié. On détecte aussi les blocs
 * ajoutés, retirés et déplacés (réordonnés).
 */

import { diffWords, type DiffPart } from "@/lib/diff";
import type { Block } from "@/lib/types";

export type BlockChangeStatus = "unchanged" | "modified" | "added" | "moved";

/** Un bloc de la révision « après », annoté de son évolution depuis « avant ». */
export interface BlockEntry {
  block: Block;
  status: BlockChangeStatus;
  /** Bloc correspondant dans la révision « avant » (absent si `added`). */
  before?: Block;
  /** Diff mot à mot (présent uniquement si `modified`). */
  parts?: DiffPart[];
}

export interface RevisionDiff {
  /** Blocs de la révision « après », dans l'ordre, annotés. */
  entries: BlockEntry[];
  /** Blocs présents « avant » mais absents « après ». */
  removed: Block[];
  summary: { added: number; removed: number; modified: number; moved: number };
}

/**
 * LCS de deux séquences d'ids (permutations d'un même ensemble). Renvoie
 * l'ensemble des ids stables ; ceux qui n'y figurent pas sont « déplacés ».
 */
function stableIds(a: string[], b: string[]): Set<string> {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const stable = new Set<string>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      stable.add(a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return stable;
}

/**
 * Compare la révision `before` (plus ancienne) à `after` (plus récente).
 * L'ordre des arguments est chronologique : on décrit ce qui a changé *pour*
 * arriver à `after`.
 */
export function diffRevisions(before: Block[], after: Block[]): RevisionDiff {
  const beforeById = new Map(before.map((b) => [b.id, b]));
  const afterIds = new Set(after.map((b) => b.id));

  // Blocs communs, dans leur ordre respectif, pour repérer les déplacements.
  const beforeCommon = before.filter((b) => afterIds.has(b.id)).map((b) => b.id);
  const afterCommon = after.filter((b) => beforeById.has(b.id)).map((b) => b.id);
  const stable = stableIds(beforeCommon, afterCommon);

  const summary = { added: 0, removed: 0, modified: 0, moved: 0 };

  const entries: BlockEntry[] = after.map((block) => {
    const prev = beforeById.get(block.id);
    if (!prev) {
      summary.added += 1;
      return { block, status: "added" as const };
    }
    if (prev.text !== block.text) {
      summary.modified += 1;
      return { block, status: "modified" as const, before: prev, parts: diffWords(prev.text, block.text) };
    }
    if (!stable.has(block.id)) {
      summary.moved += 1;
      return { block, status: "moved" as const, before: prev };
    }
    return { block, status: "unchanged" as const, before: prev };
  });

  const removed = before.filter((b) => !afterIds.has(b.id));
  summary.removed = removed.length;

  return { entries, removed, summary };
}

/** Résumé textuel court (« 2 modifiés · 1 ajouté »), vide si aucun changement. */
export function summarize(summary: RevisionDiff["summary"]): string {
  const parts: string[] = [];
  if (summary.modified) parts.push(`${summary.modified} modifié${summary.modified > 1 ? "s" : ""}`);
  if (summary.added) parts.push(`${summary.added} ajouté${summary.added > 1 ? "s" : ""}`);
  if (summary.removed) parts.push(`${summary.removed} retiré${summary.removed > 1 ? "s" : ""}`);
  if (summary.moved) parts.push(`${summary.moved} déplacé${summary.moved > 1 ? "s" : ""}`);
  return parts.join(" · ");
}
