"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitCommitVertical } from "lucide-react";
import { C } from "@/lib/tokens";
import { timeAgo } from "@/lib/time";
import { Diff } from "@/components/ui/Diff";
import { diffRevisions, summarize, type BlockEntry } from "@/lib/revision-diff";
import type { HistoryRevision } from "@/lib/history";
import type { Block } from "@/lib/types";

interface Props {
  title: string;
  articleUrl: string;
  revisions: HistoryRevision[]; // plus récente d'abord
}

const STATUS_BADGE: Record<Exclude<BlockEntry["status"], "unchanged">, { label: string; bg: string; fg: string }> = {
  modified: { label: "Modifié", bg: C.pencilSoft, fg: C.pencil },
  added: { label: "Ajouté", bg: C.acceptedSoft, fg: C.accepted },
  moved: { label: "Déplacé", bg: C.staleSoft, fg: C.stale },
};

/** Aperçu texte d'un bloc (tronqué), en Newsreader pour coller à la prose. */
function BlockText({ text, muted, strike }: { text: string; muted?: boolean; strike?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--serif)", fontSize: 14.5, lineHeight: 1.6,
        color: muted ? C.inkFaint : C.ink,
        textDecoration: strike ? "line-through" : "none",
      }}
    >
      {text || "—"}
    </span>
  );
}

export function RevisionHistoryView({ title, articleUrl, revisions }: Props) {
  // Indices dans le tableau (0 = plus récente). Par défaut : avant-dernière → dernière.
  const [afterIdx, setAfterIdx] = useState(0);
  const [beforeIdx, setBeforeIdx] = useState(revisions.length > 1 ? 1 : 0);

  const after = revisions[afterIdx];
  const before = revisions[beforeIdx];
  const diff = useMemo(
    () => diffRevisions(before?.blocks ?? [], after?.blocks ?? []),
    [before, after],
  );
  const summaryText = summarize(diff.summary);
  const sameRevision = beforeIdx === afterIdx;

  return (
    <div>
      <Link href={articleUrl} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: C.inkSoft, fontWeight: 600, marginBottom: 18 }}>
        <ArrowLeft size={14} /> Retour à l&apos;article
      </Link>

      <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 4px" }}>
        Historique — {title}
      </h1>
      <p style={{ fontSize: 13.5, color: C.inkSoft, margin: "0 0 26px" }}>
        {revisions.length} révision{revisions.length > 1 ? "s" : ""}. Sélectionnez deux versions pour voir ce qui a changé, mot à mot.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: 22, alignItems: "start" }} className="history-grid">
        {/* Timeline des révisions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {revisions.map((r, i) => {
            const isBefore = i === beforeIdx;
            const isAfter = i === afterIdx;
            const active = isBefore || isAfter;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  // Clic = choisir la cible (« après ») ; la base devient la précédente.
                  setAfterIdx(i);
                  setBeforeIdx(Math.min(i + 1, revisions.length - 1));
                }}
                style={{
                  textAlign: "left", border: `1px solid ${active ? C.pencil : C.rule}`,
                  background: active ? C.pencilSoft : C.paper, borderRadius: 10, padding: "10px 12px",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <GitCommitVertical size={14} style={{ color: C.pencil }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>Révision {r.number}</span>
                  {isBefore && !sameRevision && <Tag>base</Tag>}
                  {isAfter && <Tag>cible</Tag>}
                </div>
                <div style={{ fontSize: 12, color: C.inkSoft, paddingLeft: 21 }}>
                  {r.note || "Sans note"} · {r.author?.display_name ?? "Auteur"} · {timeAgo(r.created_at)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Panneau de comparaison */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <Selector label="Base" value={beforeIdx} onChange={setBeforeIdx} revisions={revisions} />
            <span style={{ color: C.inkFaint }}>→</span>
            <Selector label="Cible" value={afterIdx} onChange={setAfterIdx} revisions={revisions} />
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>
              {sameRevision ? "Même révision" : summaryText || "Aucun changement de texte"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {diff.entries.map((e) => (
              <BlockRow key={e.block.id} entry={e} />
            ))}
            {diff.removed.map((blk: Block) => (
              <div key={blk.id} style={{ border: `1px solid ${C.del}`, borderRadius: 10, padding: "12px 14px", background: "#fff" }}>
                <BadgeRow label="Retiré" bg={C.del} fg={C.delInk} type={blk.type} />
                <BlockText text={blk.text} muted strike />
              </div>
            ))}
            {diff.entries.length === 0 && diff.removed.length === 0 && (
              <p style={{ fontSize: 13.5, color: C.inkFaint }}>Cette révision est vide.</p>
            )}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 720px){ .history-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function BlockRow({ entry }: { entry: BlockEntry }) {
  const { status, block, parts } = entry;
  if (status === "unchanged") {
    return (
      <div style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.rule}` }}>
        <BadgeRow label="Inchangé" bg={C.panel} fg={C.inkFaint} type={block.type} />
        <BlockText text={block.text} muted />
      </div>
    );
  }
  const badge = STATUS_BADGE[status];
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${status === "modified" ? C.pencil : C.rule}`, background: "#fff" }}>
      <BadgeRow label={badge.label} bg={badge.bg} fg={badge.fg} type={block.type} />
      {status === "modified" && parts ? (
        <Diff from={entry.before!.text} to={block.text} />
      ) : (
        <BlockText text={block.text} />
      )}
    </div>
  );
}

function BadgeRow({ label, bg, fg, type }: { label: string; bg: string; fg: string; type: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ background: bg, color: fg, fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 5 }}>
        {label}
      </span>
      <span style={{ fontSize: 10.5, color: C.inkFaint, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{type}</span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ marginLeft: "auto", background: C.pencil, color: C.paper, fontSize: 10, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 5 }}>
      {children}
    </span>
  );
}

function Selector({
  label, value, onChange, revisions,
}: {
  label: string; value: number; onChange: (i: number) => void; revisions: HistoryRevision[];
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.inkSoft }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ border: `1px solid ${C.rule}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, fontFamily: "inherit", background: "#fff", color: C.ink }}
      >
        {revisions.map((r, i) => (
          <option key={r.id} value={i}>
            Révision {r.number}
          </option>
        ))}
      </select>
    </label>
  );
}
