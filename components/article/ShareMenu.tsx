"use client";

import { useState } from "react";
import { Share2, Link2, FileDown, Check } from "lucide-react";
import { C } from "@/lib/tokens";
import type { Block } from "@/lib/types";
import { blocksToMarkdown } from "@/lib/markdown";
import { XMark, LinkedinMark } from "@/components/ui/BrandMarks";

/**
 * Partage et export d'un article. La publication directe vers Substack/Medium
 * n'ayant pas d'API d'écriture publique, l'export Markdown (copie / téléchargement)
 * est le chemin de cross-post : on colle le Markdown dans l'éditeur cible.
 */
export function ShareMenu({ title, url, blocks }: { title: string; url: string; blocks: Block[] }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const absolute = typeof window !== "undefined" ? window.location.origin + url : url;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setDone(label);
      setTimeout(() => setDone(null), 1800);
    } catch {
      setDone("Échec de la copie");
    }
  }

  function downloadMarkdown() {
    const md = blocksToMarkdown(title, blocks);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const item: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px",
    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13,
    color: C.ink, textAlign: "left",
  };

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(absolute)}`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(absolute)}`;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Partager"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.rule}`, borderRadius: 8, padding: "6px 11px", fontSize: 12.5, color: C.inkSoft, cursor: "pointer", fontFamily: "inherit" }}
      >
        <Share2 size={14} /> Partager
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 41, width: 244, background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 10, boxShadow: "0 14px 34px -18px rgba(23,25,28,.5)", overflow: "hidden", padding: "4px 0" }}>
            <button style={item} onClick={() => copy(absolute, "Lien copié")}><Link2 size={15} color={C.inkSoft} /> Copier le lien</button>
            <button style={item} onClick={() => copy(blocksToMarkdown(title, blocks), "Markdown copié")}><FileDown size={15} color={C.inkSoft} /> Copier en Markdown</button>
            <button style={item} onClick={downloadMarkdown}><FileDown size={15} color={C.inkSoft} /> Télécharger .md</button>
            <div style={{ height: 1, background: C.rule, margin: "4px 0" }} />
            <a href={xUrl} target="_blank" rel="noopener noreferrer" style={{ ...item, textDecoration: "none" }}><XMark size={14} color={C.inkSoft} /> Partager sur X</a>
            <a href={liUrl} target="_blank" rel="noopener noreferrer" style={{ ...item, textDecoration: "none" }}><LinkedinMark size={14} color={C.inkSoft} /> Partager sur LinkedIn</a>
            <div style={{ padding: "8px 12px", fontSize: 11, color: C.inkFaint, lineHeight: 1.45, borderTop: `1px solid ${C.rule}`, marginTop: 4 }}>
              Pour Medium ou Substack : copiez le Markdown et collez-le dans leur éditeur (pas d&apos;API de publication publique).
            </div>
          </div>
        </>
      )}

      {done && (
        <span style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 42, display: "inline-flex", alignItems: "center", gap: 5, background: C.ink, color: C.paper, borderRadius: 7, padding: "6px 10px", fontSize: 12, whiteSpace: "nowrap" }}>
          <Check size={13} /> {done}
        </span>
      )}
    </div>
  );
}
