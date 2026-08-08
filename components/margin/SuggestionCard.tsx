"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Clock, MessageSquare, AlertTriangle, Undo2, Ban } from "lucide-react";
import { C, EASE } from "@/lib/tokens";
import type { ResolvedSuggestion } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { Btn } from "@/components/ui/Btn";
import { Diff } from "@/components/ui/Diff";
import { SuggestionThread } from "@/components/margin/SuggestionThread";
import { ReportButton } from "@/components/report/ReportButton";
import { focusExcerpt } from "@/lib/focus";

/**
 * Carte d'une suggestion dans la marge. Selon le rôle : l'auteur de l'article
 * voit accepter/refuser ; l'auteur de la suggestion peut la retirer ; sinon
 * « en attente ». Une suggestion périmée n'est plus actionnable.
 */
export function SuggestionCard({
  s,
  isArticleAuthor,
  isMine,
  active,
  busy,
  onFocus,
  onAccept,
  onReject,
  onWithdraw,
  onBlock,
  currentUserId,
}: {
  s: ResolvedSuggestion;
  isArticleAuthor: boolean;
  isMine: boolean;
  active: boolean;
  busy?: boolean;
  onFocus: (blockId: string | null) => void;
  onAccept: (s: ResolvedSuggestion) => void;
  onReject: (s: ResolvedSuggestion) => void;
  onWithdraw: (s: ResolvedSuggestion) => void;
  onBlock?: (s: ResolvedSuggestion) => void;
  currentUserId?: string | null;
}) {
  const [hov, setHov] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const stale = s.resolved_status === "stale";
  const border = active ? C.pencil : hov ? C.ruleStrong : C.rule;
  const authorName = s.author?.display_name ?? "Contributeur";

  return (
    <motion.div
      onMouseEnter={() => {
        setHov(true);
        onFocus(s.block_id);
      }}
      onMouseLeave={() => setHov(false)}
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.38, ease: EASE as unknown as [number, number, number, number] }}
      style={{
        border: `1px solid ${border}`,
        borderLeft: `2px solid ${stale ? C.stale : active ? C.pencil : border}`,
        borderRadius: 9, background: C.paper, padding: 13, marginBottom: 10,
        transform: active ? "translateX(-3px)" : "none",
        boxShadow: active ? "0 8px 24px -18px rgba(23,25,28,.5)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <Avatar name={authorName} size={22} tone={active ? "pencil" : "ink"} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{authorName}</span>
        <span style={{ fontSize: 11.5, color: C.inkFaint }}>{timeAgo(s.created_at)}</span>
        <span style={{ marginLeft: "auto" }}>
          <Pill tone={stale ? "stale" : s.kind}>
            {stale ? "périmée" : s.kind === "typo" ? "correction" : "réécriture"}
          </Pill>
        </span>
      </div>

      {s.focus_range && s.focus_range.end > s.focus_range.start && (
        <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 7, display: "flex", gap: 5, alignItems: "baseline" }}>
          <span style={{ fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", fontSize: 10 }}>Porte sur</span>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: C.inkSoft }}>« {focusExcerpt(s.original_text, s.focus_range)} »</span>
        </div>
      )}

      <Diff from={s.original_text} to={s.proposed_text} />

      {s.reason && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "flex-start" }}>
          <MessageSquare size={12} color={C.inkFaint} style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: C.inkSoft }}>{s.reason}</p>
        </div>
      )}

      {/* Fil de discussion : uniquement pour les réécritures (edit). */}
      {s.kind === "edit" && !stale && (
        <>
          <button
            onClick={() => setThreadOpen((v) => !v)}
            style={{ marginTop: 10, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.pencil, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <MessageSquare size={12} /> {threadOpen ? "Masquer la discussion" : "Discussion"}
          </button>
          {threadOpen && <SuggestionThread suggestionId={s.id} canComment={!!currentUserId} />}
        </>
      )}

      {stale ? (
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: 11, padding: "8px 9px", background: C.staleSoft, borderRadius: 6 }}>
          <AlertTriangle size={13} color={C.stale} style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 12, lineHeight: 1.45, color: C.stale }}>
            Le paragraphe a changé depuis. Cette proposition ne s&apos;applique plus.
          </span>
        </div>
      ) : isArticleAuthor ? (
        <div style={{ display: "flex", gap: 6, marginTop: 12, alignItems: "center" }}>
          <Btn variant="accept" icon={Check} disabled={busy} onClick={() => onAccept(s)}>
            Accepter
          </Btn>
          <Btn variant="outline" icon={X} disabled={busy} onClick={() => onReject(s)}>
            Refuser
          </Btn>
          {onBlock && (
            <button
              onClick={() => onBlock(s)}
              title="Bloquer ce contributeur"
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.inkFaint, display: "inline-flex", padding: 4 }}
            >
              <Ban size={14} />
            </button>
          )}
        </div>
      ) : isMine ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 11 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.inkFaint, fontSize: 12, marginRight: "auto" }}>
            <Clock size={12} /> En attente de relecture
          </span>
          <Btn variant="ghost" icon={Undo2} disabled={busy} onClick={() => onWithdraw(s)}>
            Retirer
          </Btn>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 11, color: C.inkFaint, fontSize: 12 }}>
          <Clock size={12} /> En attente de relecture
          <span style={{ marginLeft: "auto" }}>
            <ReportButton targetType="suggestion" targetId={s.id} />
          </span>
        </div>
      )}
    </motion.div>
  );
}
