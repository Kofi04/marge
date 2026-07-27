"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { C } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/time";

interface Comment {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  authorName: string;
}

/**
 * Fil de discussion d'une réécriture. Les corrections (typo) n'en ont pas :
  seules les réécritures ouvrent une discussion (règle produit, section 6).
 */
export function SuggestionThread({
  suggestionId,
  canComment,
}: {
  suggestionId: string;
  canComment: boolean;
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("suggestion_comments")
      .select("id, body, author_id, created_at")
      .eq("suggestion_id", suggestionId)
      .order("created_at", { ascending: true });
    const rows = (data as Omit<Comment, "authorName">[]) ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.author_id)));
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      for (const p of (profs as { id: string; display_name: string }[]) ?? []) names.set(p.id, p.display_name);
    }
    setComments(rows.map((r) => ({ ...r, authorName: names.get(r.author_id) ?? "Contributeur" })));
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionId]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("suggestion_comments").insert({ suggestion_id: suggestionId, author_id: user.id, body: body.trim() });
      setBody("");
      await load();
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 11, borderTop: `1px dashed ${C.rule}`, paddingTop: 10 }}>
      {comments.length === 0 && <p style={{ margin: "0 0 8px", fontSize: 12, color: C.inkFaint }}>Aucun message. Ouvrez la discussion.</p>}
      {comments.map((c) => (
        <div key={c.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{c.authorName}</span>
            <span style={{ fontSize: 11, color: C.inkFaint }}>{timeAgo(c.created_at)}</span>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>{c.body}</p>
        </div>
      ))}
      {canComment && (
        <form onSubmit={post} style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Répondre…"
            style={{ flex: 1, border: `1px solid ${C.rule}`, borderRadius: 7, padding: "6px 9px", fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "#fff", color: C.ink }}
          />
          <button type="submit" disabled={busy || !body.trim()} style={{ display: "inline-flex", alignItems: "center", background: C.ink, color: C.paper, border: "none", borderRadius: 7, padding: "0 10px", cursor: "pointer", opacity: busy || !body.trim() ? 0.5 : 1 }}>
            <Send size={13} />
          </button>
        </form>
      )}
    </div>
  );
}
