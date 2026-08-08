"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { DOMSerializer, type Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, Quote, Code, Heading1, List, ListOrdered,
  Link2, ImageIcon, Send, Save, X,
} from "lucide-react";
import { C } from "@/lib/tokens";
import { tagSchema } from "@/lib/schemas";
import type { Block } from "@/lib/types";

function newBlockId(): string {
  return "b_" + crypto.randomUUID().slice(0, 8);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Attribut global `blockId` : rend l'ancre des suggestions stable à travers les
 * révisions. Un bloc conserve son id même quand son texte ou son formatage change.
 */
const BlockId = Extension.create({
  name: "blockId",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote", "codeBlock", "image", "bulletList", "orderedList"],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (el) => el.getAttribute("data-block-id"),
            renderHTML: (attrs) => (attrs.blockId ? { "data-block-id": attrs.blockId } : {}),
          },
        },
      },
    ];
  },
});

/** Type de bloc Marge à partir du nom de nœud Tiptap. */
function nodeToBlockType(name: string): Block["type"] {
  if (name === "heading") return "h1";
  if (name === "blockquote") return "quote";
  if (name === "codeBlock") return "code";
  if (name === "image") return "image";
  return "p"; // paragraph, listes
}

export function Editor({
  initial,
}: {
  initial?: { id: string; title: string; lede: string; blocks: Block[]; tags: string[] };
}) {
  const router = useRouter();
  const existingTitle = initial?.blocks.find((b) => b.type === "h1");
  const existingLede = initial?.blocks.find((b) => b.type === "lede");

  const [title, setTitle] = useState(initial?.title ?? existingTitle?.text ?? "");
  const [lede, setLede] = useState(initial?.lede ?? existingLede?.text ?? "");
  const [titleId] = useState(existingTitle?.id ?? newBlockId());
  const [ledeId] = useState(existingLede?.id ?? newBlockId());
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const parsed = tagSchema.safeParse(tagDraft);
    if (!parsed.success) {
      if (tagDraft.trim()) setError(parsed.error.issues[0].message);
      return;
    }
    if (tags.length >= 6) return setError("6 tags maximum.");
    if (!tags.includes(parsed.data)) setTags([...tags, parsed.data]);
    setTagDraft("");
    setError(null);
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," ) {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagDraft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image,
      BlockId,
    ],
    content: initial ? bodyBlocksToHtml(initial.blocks, titleId, ledeId) : "<p></p>",
    editorProps: {
      attributes: { style: "outline:none; min-height:320px; font-family:var(--serif); font-size:17.5px; line-height:1.72;" },
    },
  });

  function assembleBlocks(): Block[] {
    if (!editor) return [];
    const serializer = DOMSerializer.fromSchema(editor.schema);
    const innerHtml = (frag: PMNode["content"]): string => {
      const div = document.createElement("div");
      div.appendChild(serializer.serializeFragment(frag));
      return div.innerHTML;
    };
    const outerHtml = (node: PMNode): string => {
      const div = document.createElement("div");
      div.appendChild(serializer.serializeNode(node));
      return div.innerHTML;
    };

    const seen = new Set<string>([titleId, ledeId]);
    const body: Block[] = [];
    editor.state.doc.forEach((node) => {
      const name = node.type.name;
      const type = nodeToBlockType(name);
      let id = (node.attrs?.blockId as string | undefined) ?? null;
      if (!id || seen.has(id)) id = newBlockId();

      if (name === "image") {
        const src = (node.attrs?.src as string) ?? "";
        if (!src) return;
        seen.add(id);
        body.push({ id, type: "image", text: src });
        return;
      }
      const text = node.textContent;
      if (!text.trim() && name !== "horizontalRule") return;
      seen.add(id);

      let html: string | undefined;
      if (name === "bulletList" || name === "orderedList") {
        html = outerHtml(node); // <ul>/<ol> complet
      } else if (name === "blockquote") {
        const p = node.firstChild;
        html = p ? innerHtml(p.content) : undefined;
      } else if (name !== "codeBlock") {
        html = innerHtml(node.content);
      }
      // On ne garde `html` que s'il porte du formatage (sinon `text` suffit).
      if (html && !/[<]/.test(html)) html = undefined;
      body.push({ id, type, text, ...(html ? { html } : {}) });
    });

    const head: Block[] = [{ id: titleId, type: "h1", text: title.trim() }];
    if (lede.trim()) head.push({ id: ledeId, type: "lede", text: lede.trim() });
    return [...head, ...body];
  }

  async function save(status: "draft" | "published") {
    setError(null);
    if (!title.trim()) return setError("Le titre est requis.");
    const blocks = assembleBlocks();
    if (blocks.length <= 1) return setError("L'article est vide.");
    setBusy(true);
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: initial?.id, title: title.trim(), lede: lede.trim(), blocks, tags, status }),
    });
    setBusy(false);
    const j = await res.json().catch(() => null);
    if (!res.ok) return setError(j?.message ?? "Échec de l'enregistrement.");
    router.push(j.url);
    router.refresh();
  }

  function addLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL du lien", prev ?? "https://");
    if (url === null) return;
    if (url === "") return editor.chain().focus().extendMarkRange("link").unsetLink().run();
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function addImage() {
    if (!editor) return;
    const url = window.prompt("URL de l'image");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  const tbtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
    borderRadius: 7, border: `1px solid ${C.rule}`, background: active ? C.pencilSoft : C.paper,
    color: active ? C.pencil : C.inkSoft, cursor: "pointer",
  });

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de l'article"
        style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", background: "transparent", fontFamily: "var(--serif)", fontSize: 38, fontWeight: 500, letterSpacing: "-.02em", color: C.ink, margin: "0 0 10px" }}
      />
      <input
        value={lede}
        onChange={(e) => setLede(e.target.value)}
        placeholder="Chapô (optionnel)"
        style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", background: "transparent", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19, color: C.inkSoft, margin: "0 0 22px" }}
      />

      {editor && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, position: "sticky", top: 70, zIndex: 5, background: C.paper, paddingBottom: 4 }}>
          <button title="Titre" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} style={tbtn(editor.isActive("heading", { level: 1 }))}><Heading1 size={16} /></button>
          <button title="Gras" onClick={() => editor.chain().focus().toggleBold().run()} style={tbtn(editor.isActive("bold"))}><Bold size={16} /></button>
          <button title="Italique" onClick={() => editor.chain().focus().toggleItalic().run()} style={tbtn(editor.isActive("italic"))}><Italic size={16} /></button>
          <button title="Lien" onClick={addLink} style={tbtn(editor.isActive("link"))}><Link2 size={16} /></button>
          <button title="Image" onClick={addImage} style={tbtn(false)}><ImageIcon size={16} /></button>
          <button title="Liste à puces" onClick={() => editor.chain().focus().toggleBulletList().run()} style={tbtn(editor.isActive("bulletList"))}><List size={16} /></button>
          <button title="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={tbtn(editor.isActive("orderedList"))}><ListOrdered size={16} /></button>
          <button title="Citation" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={tbtn(editor.isActive("blockquote"))}><Quote size={16} /></button>
          <button title="Code" onClick={() => editor.chain().focus().toggleCodeBlock().run()} style={tbtn(editor.isActive("codeBlock"))}><Code size={16} /></button>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 18 }} className="editor-body">
        <EditorContent editor={editor} />
      </div>

      {/* Tags : découverte via recherche et pages de tags. */}
      <div style={{ marginTop: 22, borderTop: `1px solid ${C.rule}`, paddingTop: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, marginBottom: 8 }}>Tags <span style={{ color: C.inkFaint, fontWeight: 400 }}>(6 max)</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {tags.map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: C.pencil, background: C.pencilSoft, padding: "3px 6px 3px 9px", borderRadius: 999 }}>
              #{t}
              <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Retirer ${t}`} style={{ display: "inline-flex", background: "none", border: "none", color: C.pencil, cursor: "pointer", padding: 0 }}>
                <X size={13} />
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value.toLowerCase())}
            onKeyDown={onTagKeyDown}
            onBlur={addTag}
            placeholder={tags.length ? "Ajouter…" : "design, écriture, produit…"}
            style={{ flex: "1 0 120px", minWidth: 120, border: "none", outline: "none", background: "transparent", fontSize: 13.5, fontFamily: "inherit", color: C.ink, padding: "4px 2px" }}
          />
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: C.delInk, background: C.del, padding: "9px 12px", borderRadius: 8, marginTop: 16 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 24, borderTop: `1px solid ${C.rule}`, paddingTop: 18 }}>
        <button onClick={() => save("published")} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.ink, color: C.paper, border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
          <Send size={15} /> {initial ? "Publier la révision" : "Publier"}
        </button>
        <button onClick={() => save("draft")} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", color: C.ink, border: `1px solid ${C.rule}`, borderRadius: 9, padding: "10px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <Save size={15} /> Brouillon
        </button>
      </div>

      <style>{`
        .editor-body a { color: ${C.pencil}; text-decoration: underline; }
        .editor-body img { max-width: 100%; border-radius: 8px; }
        .editor-body blockquote { padding-left: 18px; border-left: 2px solid ${C.ink}; }
        .editor-body ul, .editor-body ol { padding-left: 22px; }
        .editor-body pre { background: ${C.panel}; border-radius: 8px; padding: 12px 14px; font-family: ui-monospace, monospace; font-size: 14px; }
      `}</style>
    </div>
  );
}

/** Blocs de corps → HTML de chargement (les h1/lede titre/chapô sont exclus). */
function bodyBlocksToHtml(blocks: Block[], titleId: string, ledeId: string): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.id === titleId || b.id === ledeId) continue;
    const idAttr = `data-block-id="${b.id}"`;
    const inner = b.html ?? escapeHtml(b.text);
    switch (b.type) {
      case "image":
        parts.push(`<img ${idAttr} src="${b.text.replace(/"/g, "&quot;")}">`);
        break;
      case "code":
        parts.push(`<pre ${idAttr}><code>${escapeHtml(b.text)}</code></pre>`);
        break;
      case "quote":
        parts.push(`<blockquote ${idAttr}><p>${inner}</p></blockquote>`);
        break;
      case "h1":
        parts.push(`<h1 ${idAttr}>${inner}</h1>`);
        break;
      default:
        // paragraphe ou liste : si html est déjà un <ul>/<ol>, on l'injecte tel quel.
        if (b.html && /^\s*<(ul|ol)/i.test(b.html)) parts.push(b.html);
        else parts.push(`<p ${idAttr}>${inner}</p>`);
    }
  }
  return parts.join("") || "<p></p>";
}
