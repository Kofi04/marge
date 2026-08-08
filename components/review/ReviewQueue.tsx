"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, Inbox, Keyboard } from "lucide-react";
import { C } from "@/lib/tokens";
import type { ReviewItem } from "@/lib/queries";
import { timeAgo } from "@/lib/time";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { Btn } from "@/components/ui/Btn";
import { Diff } from "@/components/ui/Diff";

/** File de relecture : toutes suggestions ouvertes, tous articles de l'auteur. */
export function ReviewQueue({ items, userId }: { items: ReviewItem[]; userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Realtime : la file se met à jour quand une proposition arrive.
  useEffect(() => {
    const channel = supabase
      .channel(`review-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, () => router.refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  const accept = useCallback(async (item: ReviewItem) => {
    setBusyId(item.id);
    const { error } = await supabase.rpc("accept_suggestion", { suggestion_id: item.id });
    setBusyId(null);
    setMsg(error ? "Impossible d'accepter (bloc modifié ?)." : `Révision publiée · ${item.author?.display_name ?? "contributeur"} crédité`);
    router.refresh();
  }, [supabase, router]);

  const reject = useCallback(async (item: ReviewItem) => {
    setBusyId(item.id);
    await supabase
      .from("suggestions")
      .update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by: userId })
      .eq("id", item.id);
    setBusyId(null);
    setMsg("Proposition refusée");
    router.refresh();
  }, [supabase, userId, router]);

  // Raccourcis clavier : J/K naviguer, A accepter, R refuser, ? aide.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (items.length === 0) return;

      const key = e.key.toLowerCase();
      if (key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, items.length - 1));
      } else if (key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (key === "a") {
        const item = items[Math.min(selected, items.length - 1)];
        if (item && item.resolved_status !== "stale" && busyId !== item.id) { e.preventDefault(); void accept(item); }
      } else if (key === "r") {
        const item = items[Math.min(selected, items.length - 1)];
        if (item && item.resolved_status !== "stale" && busyId !== item.id) { e.preventDefault(); void reject(item); }
      } else if (e.key === "?") {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (e.key === "Escape") {
        setShowHelp(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selected, busyId, accept, reject]);

  // Fait défiler la carte sélectionnée dans la vue.
  useEffect(() => {
    cardRefs.current[selected]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  if (items.length === 0) {
    return (
      <div style={{ border: `1px dashed ${C.rule}`, borderRadius: 12, padding: 40, textAlign: "center", marginTop: 24 }}>
        <Inbox size={22} color={C.inkFaint} />
        <p style={{ margin: "12px 0 0", fontSize: 14, color: C.inkSoft }}>
          Aucune proposition en attente. Tout est à jour.
        </p>
      </div>
    );
  }

  const sel = Math.min(selected, items.length - 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
      {/* Indice raccourcis clavier */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.inkFaint }}>
        <Keyboard size={14} />
        <span><Kbd>J</Kbd> <Kbd>K</Kbd> naviguer · <Kbd>A</Kbd> accepter · <Kbd>R</Kbd> refuser · <Kbd>?</Kbd> aide</span>
      </div>

      {showHelp && (
        <div style={{ border: `1px solid ${C.pencil}`, background: C.pencilSoft, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: C.ink }}>
          <strong style={{ fontSize: 12.5 }}>Raccourcis</strong>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginTop: 8 }}>
            <span><Kbd>J</Kbd> / <Kbd>↓</Kbd></span><span>proposition suivante</span>
            <span><Kbd>K</Kbd> / <Kbd>↑</Kbd></span><span>proposition précédente</span>
            <span><Kbd>A</Kbd></span><span>accepter la sélection</span>
            <span><Kbd>R</Kbd></span><span>refuser la sélection</span>
            <span><Kbd>?</Kbd></span><span>afficher / masquer cette aide</span>
          </div>
        </div>
      )}

      {msg && (
        <div style={{ fontSize: 13, color: C.accepted, background: C.acceptedSoft, borderRadius: 8, padding: "9px 12px" }}>{msg}</div>
      )}
      {items.map((s, i) => {
        const stale = s.resolved_status === "stale";
        const isSel = i === sel;
        return (
          <div
            key={s.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            onMouseEnter={() => setSelected(i)}
            style={{
              border: `1px solid ${isSel ? C.pencil : C.rule}`,
              borderLeft: `2px solid ${stale ? C.stale : C.pencil}`,
              borderRadius: 10, background: isSel ? C.pencilSoft : C.paper, padding: 15,
              transition: "border-color .15s, background .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Avatar name={s.author?.display_name ?? "Contributeur"} size={22} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.author?.display_name ?? "Contributeur"}</span>
              <span style={{ fontSize: 11.5, color: C.inkFaint }}>{timeAgo(s.created_at)}</span>
              <span style={{ marginLeft: "auto" }}>
                <Pill tone={stale ? "stale" : s.kind}>{stale ? "périmée" : s.kind === "typo" ? "correction" : "réécriture"}</Pill>
              </span>
            </div>
            <Link href={`/@${s.author_handle}/${s.article_slug}`} style={{ fontSize: 12, color: C.inkFaint, display: "inline-block", marginBottom: 10 }}>
              sur « {s.article_title} »
            </Link>
            <Diff from={s.original_text} to={s.proposed_text} />
            {s.reason && <p style={{ margin: "10px 0 0", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>{s.reason}</p>}
            {stale ? (
              <p style={{ margin: "11px 0 0", fontSize: 12, color: C.stale }}>Le paragraphe a changé depuis ; cette proposition ne s&apos;applique plus.</p>
            ) : (
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <Btn variant="accept" icon={Check} disabled={busyId === s.id} onClick={() => accept(s)}>Accepter</Btn>
                <Btn variant="outline" icon={X} disabled={busyId === s.id} onClick={() => reject(s)}>Refuser</Btn>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Touche clavier stylée. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{ display: "inline-block", minWidth: 16, textAlign: "center", padding: "1px 5px", borderRadius: 5, border: `1px solid ${C.rule}`, background: C.panel, fontSize: 11, fontFamily: "ui-monospace, monospace", color: C.inkSoft }}>
      {children}
    </kbd>
  );
}
