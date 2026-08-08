"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { C } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/time";
import { tokenizeMentions, mentionQueryAtCaret } from "@/lib/mentions";

interface Comment {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  authorName: string;
}

interface HandleMatch {
  handle: string;
  display_name: string;
}

/**
 * Fil de discussion d'une réécriture. Les corrections (typo) n'en ont pas :
 * seules les réécritures ouvrent une discussion (règle produit, section 6).
 * Les @mentions sont rendues en liens et notifient les mentionnés (trigger SQL).
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-complétion des @mentions.
  const [matches, setMatches] = useState<HandleMatch[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);

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

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setBody(value);
    const caret = e.target.selectionStart ?? value.length;
    const token = mentionQueryAtCaret(value, caret);
    if (!token) {
      setMatches([]);
      setMentionStart(null);
      return;
    }
    setMentionStart(token.start);
    if (token.query.length === 0) {
      setMatches([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("handle, display_name")
      .ilike("handle", `${token.query}%`)
      .limit(5);
    setMatches((data as HandleMatch[]) ?? []);
  }

  function pickMention(handle: string) {
    if (mentionStart === null) return;
    const caret = inputRef.current?.selectionStart ?? body.length;
    const next = `${body.slice(0, mentionStart)}@${handle} ${body.slice(caret)}`;
    setBody(next);
    setMatches([]);
    setMentionStart(null);
    inputRef.current?.focus();
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("suggestion_comments").insert({ suggestion_id: suggestionId, author_id: user.id, body: body.trim() });
      setBody("");
      setMatches([]);
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
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
            {tokenizeMentions(c.body).map((t, i) =>
              t.handle ? (
                <Link key={i} href={`/@${t.handle}`} style={{ color: C.pencil, fontWeight: 600 }}>{t.text}</Link>
              ) : (
                <span key={i}>{t.text}</span>
              ),
            )}
          </p>
        </div>
      ))}
      {canComment && (
        <form onSubmit={post} style={{ position: "relative", display: "flex", gap: 6, marginTop: 6 }}>
          <input
            ref={inputRef}
            value={body}
            onChange={onChange}
            placeholder="Répondre… (@ pour mentionner)"
            style={{ flex: 1, border: `1px solid ${C.rule}`, borderRadius: 7, padding: "6px 9px", fontSize: 12.5, fontFamily: "inherit", outline: "none", background: C.field, color: C.ink }}
          />
          <button type="submit" disabled={busy || !body.trim()} style={{ display: "inline-flex", alignItems: "center", background: C.ink, color: C.paper, border: "none", borderRadius: 7, padding: "0 10px", cursor: "pointer", opacity: busy || !body.trim() ? 0.5 : 1 }}>
            <Send size={13} />
          </button>

          {matches.length > 0 && (
            <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, minWidth: 180, background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 8, boxShadow: "0 8px 24px -16px rgba(23,25,28,.5)", overflow: "hidden", zIndex: 10 }}>
              {matches.map((m) => (
                <button
                  key={m.handle}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickMention(m.handle); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", textAlign: "left", padding: "6px 10px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{m.display_name}</span>
                  <span style={{ fontSize: 11.5, color: C.pencil }}>@{m.handle}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
