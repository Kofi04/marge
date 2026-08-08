/**
 * Import Markdown → blocs Marge. Chaque bloc reçoit un id neuf. Le `text` reste
 * le texte brut (ancre des suggestions) ; `html` porte le formatage riche
 * optionnel (gras, italique, liens, code, listes) quand il y en a.
 *
 * Volontairement minimal (pas de dépendance) : titres, citations, blocs de code,
 * listes à puces / numérotées, et inline **gras** / *italique* / `code` / [lien](url).
 */

import type { Block, BlockType } from "@/lib/types";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Convertit le Markdown inline d'une ligne en HTML (contenu déjà échappé). */
export function inlineToHtml(s: string): string {
  let h = escapeHtml(s);
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => `<a href="${String(u).replace(/"/g, "&quot;")}">${t}</a>`);
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  return h;
}

/** Retire les marqueurs Markdown inline pour obtenir le texte brut (ancre). */
export function inlineToText(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\s][^*]*)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

const LIST_RE = /^\s*([-*+]|\d+\.)\s+/;

export function markdownToBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const push = (type: BlockType, text: string, html?: string) => {
    blocks.push({
      id: `md_${blocks.length}`,
      type,
      text,
      ...(html && /</.test(html) ? { html } : {}),
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // Bloc de code ```…```
    if (/^\s*```/.test(line)) {
      i++;
      const code: string[] = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; // saute la clôture
      push("code", code.join("\n"));
      continue;
    }

    // Titre # … (tous niveaux → h1, Marge n'a qu'un niveau de titre)
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { push("h1", inlineToText(h[2]).trim(), inlineToHtml(h[2].trim())); i++; continue; }

    // Citation > …
    if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
      const joined = q.join(" ").trim();
      push("quote", inlineToText(joined), inlineToHtml(joined));
      continue;
    }

    // Liste à puces / numérotée
    if (LIST_RE.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && LIST_RE.test(lines[i])) { items.push(lines[i].replace(LIST_RE, "")); i++; }
      const tag = ordered ? "ol" : "ul";
      const html = `<${tag}>${items.map((it) => `<li>${inlineToHtml(it)}</li>`).join("")}</${tag}>`;
      push("p", items.map((it) => inlineToText(it)).join("\n"), html);
      continue;
    }

    // Paragraphe : lignes consécutives jusqu'à une ligne vide ou un marqueur de bloc.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|>\s?|\s*```)/.test(lines[i]) &&
      !LIST_RE.test(lines[i])
    ) {
      para.push(lines[i]); i++;
    }
    const joined = para.join(" ").trim();
    push("p", inlineToText(joined), inlineToHtml(joined));
  }

  return blocks;
}
