import type { Block } from "@/lib/types";

/** Convertit une portion de HTML inline (liens, gras, italique, code) en Markdown. */
function inlineHtmlToMarkdown(html: string): string {
  return html
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)>(.*?)<\/\1>/gi, "_$2_")
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    .replace(/<br\s*\/?>(\n)?/gi, "\n")
    .replace(/<[^>]+>/g, "") // retire les balises restantes
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** Texte riche d'un bloc en Markdown (html si présent, sinon texte brut). */
function blockInline(block: Block): string {
  return block.html ? inlineHtmlToMarkdown(block.html) : block.text;
}

/** Sérialise un article (titre + blocs) en Markdown, pour l'export / le cross-post. */
export function blocksToMarkdown(title: string, blocks: Block[]): string {
  const lines: string[] = [];
  const bodyBlocks = blocks.filter((b) => b.type !== "h1"); // le titre vient en H1 unique
  lines.push(`# ${title}`, "");

  for (const b of bodyBlocks) {
    switch (b.type) {
      case "lede":
        lines.push(`_${b.text}_`, "");
        break;
      case "quote":
        lines.push(`> ${blockInline(b)}`, "");
        break;
      case "code":
        lines.push("```", b.text, "```", "");
        break;
      case "image":
        lines.push(`![](${b.text})`, "");
        break;
      default:
        lines.push(blockInline(b), "");
    }
  }
  return lines.join("\n").trim() + "\n";
}
