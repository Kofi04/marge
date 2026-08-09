"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PenLine, Trash2, Send, EyeOff, Archive, RotateCcw, MessageSquare, ExternalLink, Loader2,
} from "lucide-react";
import { C } from "@/lib/tokens";
import { timeAgo } from "@/lib/time";
import { useDialog } from "@/components/ui/Dialog";
import type { MyArticle } from "@/lib/my-articles";
import type { ArticleStatus } from "@/lib/types";

const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const STATUS_STYLE: Record<ArticleStatus, { bg: string; fg: string }> = {
  draft: { bg: C.panel, fg: C.inkSoft },
  published: { bg: C.acceptedSoft, fg: C.accepted },
  archived: { bg: C.staleSoft, fg: C.stale },
};

export function MyArticlesList({ articles, handle }: { articles: MyArticle[]; handle: string }) {
  const router = useRouter();
  const { confirm } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(id: string, status: ArticleStatus) {
    setError(null);
    setBusyId(id);
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Action impossible.");
      return;
    }
    router.refresh();
  }

  async function remove(id: string, title: string) {
    const ok = await confirm({
      title: `Supprimer « ${title} » ?`,
      message: "Les révisions et suggestions liées seront définitivement perdues. Cette action est irréversible.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    setBusyId(id);
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Suppression impossible.");
      return;
    }
    router.refresh();
  }

  if (articles.length === 0) {
    return (
      <div style={{ border: `1px dashed ${C.rule}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
        <p style={{ margin: "0 0 14px", fontSize: 14, color: C.inkSoft }}>
          Vous n&apos;avez pas encore d&apos;article.
        </p>
        <Link href="/write" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.ink, color: C.paper, padding: "9px 15px", borderRadius: 9, fontSize: 14, fontWeight: 600 }}>
          <PenLine size={15} /> Écrire un article
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && (
        <p style={{ margin: 0, fontSize: 13, color: C.delInk, background: C.del, padding: "9px 12px", borderRadius: 8 }}>{error}</p>
      )}
      {articles.map((a) => {
        const s = STATUS_STYLE[a.status];
        const busy = busyId === a.id;
        return (
          <div key={a.id} style={{ border: `1px solid ${C.rule}`, borderRadius: 12, padding: "16px 18px", background: C.paper, opacity: busy ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 6 }}>
                {STATUS_LABEL[a.status]}
              </span>
              {a.revisionNumber != null && a.revisionNumber > 1 && (
                <span style={{ fontSize: 12, color: C.inkFaint }}>rév. {a.revisionNumber}</span>
              )}
              {a.openSuggestions > 0 && (
                <Link href="/review" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.pencil, fontWeight: 600 }}>
                  <MessageSquare size={12} /> {a.openSuggestions} en attente
                </Link>
              )}
              <span style={{ marginLeft: "auto", fontSize: 12, color: C.inkFaint }}>
                {a.status === "published" && a.published_at ? `publié ${timeAgo(a.published_at)}` : `créé ${timeAgo(a.created_at)}`}
              </span>
            </div>

            <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 500, letterSpacing: "-.01em", marginBottom: a.lede ? 3 : 10 }}>
              {a.title}
            </div>
            {a.lede && <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 12 }}>{a.lede}</div>}

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {a.status === "published" && (
                <ActionLink href={`/@${handle}/${a.slug}`} icon={ExternalLink} label="Voir" />
              )}
              <ActionLink href={`/write?edit=${a.id}`} icon={PenLine} label="Éditer" />

              {a.status !== "published" && (
                <ActionBtn onClick={() => setStatus(a.id, "published")} icon={Send} label="Publier" disabled={busy} accent />
              )}
              {a.status === "published" && (
                <ActionBtn onClick={() => setStatus(a.id, "draft")} icon={EyeOff} label="Dépublier" disabled={busy} />
              )}
              {a.status !== "archived" && (
                <ActionBtn onClick={() => setStatus(a.id, "archived")} icon={Archive} label="Archiver" disabled={busy} />
              )}
              {a.status === "archived" && (
                <ActionBtn onClick={() => setStatus(a.id, "published")} icon={RotateCcw} label="Republier" disabled={busy} />
              )}

              <ActionBtn onClick={() => remove(a.id, a.title)} icon={busy ? Loader2 : Trash2} label="Supprimer" disabled={busy} danger />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600,
  padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.rule}`, background: C.paper,
  color: C.ink, cursor: "pointer", fontFamily: "inherit",
};

function ActionLink({ href, icon: Icon, label }: { href: string; icon: typeof PenLine; label: string }) {
  return (
    <Link href={href} style={btnBase}>
      <Icon size={13} /> {label}
    </Link>
  );
}

function ActionBtn({
  onClick, icon: Icon, label, disabled, accent, danger,
}: {
  onClick: () => void; icon: typeof PenLine; label: string; disabled?: boolean; accent?: boolean; danger?: boolean;
}) {
  const style: React.CSSProperties = { ...btnBase, opacity: disabled ? 0.5 : 1 };
  if (accent) { style.background = C.ink; style.color = C.paper; style.borderColor = C.ink; }
  if (danger) { style.color = C.delInk; style.borderColor = C.del; }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={style}>
      <Icon size={13} /> {label}
    </button>
  );
}
