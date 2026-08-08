"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine, Check, X, GitBranch, Users, ChevronRight, Sparkles,
  Eye, History, Clock,
} from "lucide-react";
import { C } from "@/lib/tokens";
import type { ArticleView as ArticleViewData } from "@/lib/queries";
import type { Block, ResolvedSuggestion } from "@/lib/types";
import { resolveStatus } from "@/lib/stale";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Composer, type ComposerSubmit } from "@/components/margin/Composer";
import { SuggestionCard } from "@/components/margin/SuggestionCard";
import { ShareMenu } from "@/components/article/ShareMenu";
import { FollowButton } from "@/components/follow/FollowButton";

const DRAFT_KEY = "marge:draft";

interface Draft {
  articleId: string;
  blockId: string;
  proposed: string;
  reason: string;
}

interface CurrentUser {
  id: string;
  displayName: string;
}

const BLOCK_STYLES: Record<Block["type"], React.CSSProperties> = {
  h1: { fontFamily: "var(--serif)", fontSize: 40, lineHeight: 1.12, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 14px" },
  lede: { fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.55, fontStyle: "italic", color: C.inkSoft, margin: "0 0 26px" },
  p: { fontFamily: "var(--serif)", fontSize: 17.5, lineHeight: 1.72, margin: "0 0 20px" },
  quote: { fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.55, margin: "26px 0", paddingLeft: 18, borderLeft: `2px solid ${C.ink}`, fontWeight: 500 },
  code: { fontFamily: "ui-monospace, monospace", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px", background: C.panel, borderRadius: 8, padding: "12px 14px", whiteSpace: "pre-wrap" },
  image: { fontFamily: "var(--sans)", fontSize: 13, color: C.inkFaint, margin: "0 0 20px", fontStyle: "italic" },
};

export function ArticleView({
  data,
  currentUser,
  isArticleAuthor,
  articleUrl,
}: {
  data: ArticleViewData;
  currentUser: CurrentUser | null;
  isArticleAuthor: boolean;
  articleUrl: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const blocks: Block[] = useMemo(() => data.currentRevision?.blocks ?? [], [data.currentRevision]);
  const [suggestions, setSuggestions] = useState<ResolvedSuggestion[]>(data.suggestions);
  const [editing, setEditing] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ icon: typeof Check; text: string } | null>(null);

  // Resync quand les données serveur changent (après router.refresh()).
  useEffect(() => setSuggestions(data.suggestions), [data.suggestions]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Recalcule le périmé côté client contre les blocs courants.
  const resolved = useMemo(
    () =>
      suggestions.map((s) => {
        const { resolved_status, is_stale } = resolveStatus(s, blocks);
        return { ...s, resolved_status, is_stale };
      }),
    [suggestions, blocks],
  );

  const queue = resolved.filter((s) => s.resolved_status === "open" || s.resolved_status === "stale");
  const openCount = resolved.filter((s) => s.resolved_status === "open").length;
  const revNumber = data.currentRevision?.number ?? 1;

  const postSuggestion = useCallback(
    async (draft: Draft): Promise<boolean> => {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: draft.articleId,
          block_id: draft.blockId,
          proposed_text: draft.proposed,
          reason: draft.reason,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setToast({ icon: X, text: j?.message ?? "Échec de l'envoi." });
        return false;
      }
      setToast({ icon: Sparkles, text: "Proposition envoyée à l'auteur" });
      router.refresh();
      return true;
    },
    [router],
  );

  // Rejeu du brouillon après authentification (onboarding contributeur).
  useEffect(() => {
    if (!currentUser) return;
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Draft;
      if (draft.articleId !== data.article.id) return;
      sessionStorage.removeItem(DRAFT_KEY);
      void postSuggestion(draft);
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, [currentUser, data.article.id, postSuggestion]);

  function onComposerSubmit(block: Block, payload: ComposerSubmit) {
    const draft: Draft = {
      articleId: data.article.id,
      blockId: block.id,
      proposed: payload.proposed,
      reason: payload.reason,
    };
    // Lecteur non connecté : on conserve le brouillon et on l'envoie à l'auth,
    // pour le rejouer au retour. La contribution n'est jamais perdue.
    if (!currentUser) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      router.push(`/login?next=${encodeURIComponent(articleUrl)}`);
      return;
    }
    setSubmitting(true);
    setEditing(null);
    void postSuggestion(draft).finally(() => setSubmitting(false));
  }

  async function accept(s: ResolvedSuggestion) {
    setBusyId(s.id);
    const { error } = await supabase.rpc("accept_suggestion", { suggestion_id: s.id });
    setBusyId(null);
    if (error) {
      setToast({ icon: X, text: humanizeAcceptError(error.message) });
      router.refresh();
      return;
    }
    setFlash(s.block_id);
    setTimeout(() => setFlash(null), 1400);
    setToast({ icon: Check, text: `Révision ${revNumber + 1} publiée · ${s.author?.display_name ?? "contributeur"} crédité` });
    router.refresh();
  }

  async function reject(s: ResolvedSuggestion) {
    setBusyId(s.id);
    const { error } = await supabase
      .from("suggestions")
      .update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by: currentUser?.id })
      .eq("id", s.id);
    setBusyId(null);
    setToast(error ? { icon: X, text: error.message } : { icon: X, text: "Proposition refusée" });
    router.refresh();
  }

  async function withdraw(s: ResolvedSuggestion) {
    setBusyId(s.id);
    const { error } = await supabase.from("suggestions").update({ status: "withdrawn" }).eq("id", s.id);
    setBusyId(null);
    setToast(error ? { icon: X, text: error.message } : { icon: X, text: "Proposition retirée" });
    router.refresh();
  }

  async function block(s: ResolvedSuggestion) {
    if (!currentUser) return;
    setBusyId(s.id);
    const { error } = await supabase
      .from("author_blocks")
      .insert({ author_id: currentUser.id, blocked_id: s.author_id });
    setBusyId(null);
    setToast(error ? { icon: X, text: error.message } : { icon: X, text: `${s.author?.display_name ?? "Contributeur"} bloqué` });
    router.refresh();
  }

  // Realtime : l'auteur voit arriver les propositions sans recharger.
  useEffect(() => {
    const channel = supabase
      .channel(`article-${data.article.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suggestions", filter: `article_id=eq.${data.article.id}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, data.article.id, router]);

  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: "var(--sans)", color: C.ink }}>
      {/* Barre supérieure */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(252,252,250,.88)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <Link href={currentUser ? "/home" : "/"} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>M</div>
            <span style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: "-.01em" }}>Marge</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 6, color: C.inkFaint, fontSize: 12.5 }}>
            <GitBranch size={13} /> révision {revNumber}
            {data.revisions.length > 1 && (
              <button onClick={() => setShowHistory((v) => !v)} style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: "2px 4px", display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "inherit", fontSize: 12.5 }}>
                <History size={13} /> historique
              </button>
            )}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <ShareMenu title={data.article.title} url={articleUrl} blocks={blocks} />
            {isArticleAuthor && openCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.pencil, fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: 6, background: C.pencil }} />
                {openCount} à relire
              </span>
            )}
            {currentUser ? (
              <>
                <Link href="/review" style={{ fontSize: 12.5, color: C.inkSoft }}>File</Link>
                <Link href="/settings" style={{ display: "inline-flex" }}>
                  <Avatar name={currentUser.displayName} />
                </Link>
              </>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(articleUrl)}`} style={{ fontSize: 13, fontWeight: 600, background: C.ink, color: C.paper, padding: "7px 13px", borderRadius: 8 }}>
                Se connecter
              </Link>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ borderTop: `1px solid ${C.rule}`, background: C.panel, overflow: "hidden" }}>
              <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 22px", display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
                {data.revisions.map((r) => (
                  <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.number === revNumber ? C.paper : C.inkSoft, background: r.number === revNumber ? C.ink : "#E4E4DD", borderRadius: 5, padding: "2px 6px" }}>v{r.number}</span>
                    <div>
                      <div style={{ fontSize: 12.5, color: C.ink }}>{r.note ?? "Révision"}</div>
                      <div style={{ fontSize: 11.5, color: C.inkFaint }}>{new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                    </div>
                  </div>
                ))}
                <Link href={`${articleUrl}/history`} style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: C.pencil, whiteSpace: "nowrap" }}>
                  Voir le diff détaillé →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Corps */}
      <div className="shell" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 22px 90px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 350px", gap: 34, alignItems: "start" }}>
        {/* Article */}
        <article style={{ maxWidth: 660 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 26, color: C.inkFaint, fontSize: 12.5 }}>
            <Avatar name={data.author.display_name} size={22} />
            <Link href={`/@${data.author.handle}`} style={{ color: C.ink, fontWeight: 600 }}>{data.author.display_name}</Link>
            <span>·</span>
            <span>{data.article.status === "published" ? "Publié" : "Brouillon"}</span>
            <span style={{ marginLeft: "auto" }}>
              <FollowButton targetId={data.article.author_id} size="sm" />
            </span>
          </div>

          {data.article.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 26 }}>
              {data.article.tags.map((t) => (
                <Link key={t} href={`/tags/${encodeURIComponent(t)}`} style={{ fontSize: 11.5, fontWeight: 600, color: C.pencil, background: C.pencilSoft, padding: "2px 8px", borderRadius: 999 }}>
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {blocks.map((b) => {
            const open = queue.filter((s) => s.block_id === b.id);
            const isEditing = editing === b.id;
            const dimmed = focused && focused !== b.id;
            const typo = BLOCK_STYLES[b.type];

            return (
              <div
                key={b.id}
                className="blk"
                onMouseEnter={() => !editing && setFocused(b.id)}
                onMouseLeave={() => !editing && setFocused(null)}
                style={{ position: "relative", transition: "opacity .3s", opacity: dimmed ? 0.42 : 1 }}
              >
                {!isArticleAuthor && !isEditing && (
                  <button
                    className="marker"
                    onClick={() => {
                      setEditing(b.id);
                      setFocused(b.id);
                    }}
                    aria-label="Suggérer une modification"
                    style={{ position: "absolute", left: -34, top: 4, width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.rule}`, background: C.paper, color: C.pencil, cursor: "pointer", display: "grid", placeItems: "center" }}
                  >
                    <PenLine size={12} />
                  </button>
                )}

                {open.length > 0 && (
                  <span style={{ position: "absolute", right: -26, top: 6, fontSize: 11, fontWeight: 700, color: open.some((s) => s.resolved_status === "stale") ? C.stale : C.pencil, display: "inline-flex", alignItems: "center", gap: 2 }}>
                    {open.length}
                    <ChevronRight size={11} />
                  </span>
                )}

                <div className={flash === b.id ? "flash" : ""}>{renderBlock(b, typo)}</div>

                {isEditing && (
                  <Composer block={b} busy={submitting} onCancel={() => setEditing(null)} onSubmit={(payload) => onComposerSubmit(b, payload)} />
                )}
              </div>
            );
          })}

          {/* Crédits */}
          <div style={{ marginTop: 44, paddingTop: 22, borderTop: `1px solid ${C.rule}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, color: C.inkFaint, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
              <Users size={13} /> Ont amélioré cet article
            </div>
            {data.contributors.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13.5, color: C.inkFaint }}>
                Personne encore. La première proposition acceptée apparaîtra ici.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.contributors.map((c) => (
                  <Link key={c.profile.id} href={`/@${c.profile.handle}`} style={{ display: "flex", alignItems: "center", gap: 7, background: C.panel, borderRadius: 20, padding: "5px 12px 5px 5px" }}>
                    <Avatar name={c.profile.display_name} size={22} tone="pencil" />
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.profile.display_name}</span>
                    <span style={{ fontSize: 11.5, color: C.inkFaint }}>{c.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Marge */}
        <aside className="rail" style={{ position: "sticky", top: 78, borderLeft: `1px solid ${C.rule}`, paddingLeft: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.inkFaint }}>
              {isArticleAuthor ? "File de relecture" : "Propositions en cours"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.inkFaint }}>{queue.length}</span>
          </div>

          {queue.length === 0 ? (
            <div style={{ border: `1px dashed ${C.rule}`, borderRadius: 9, padding: 20, textAlign: "center" }}>
              <Eye size={17} color={C.inkFaint} />
              <p style={{ margin: "9px 0 0", fontSize: 13, lineHeight: 1.5, color: C.inkSoft }}>
                Rien à relire.
                {!isArticleAuthor && (
                  <>
                    <br />
                    <span style={{ color: C.inkFaint }}>Survolez un paragraphe pour en proposer une.</span>
                  </>
                )}
              </p>
            </div>
          ) : (
            queue.map((s) => (
              <SuggestionCard
                key={s.id}
                s={s}
                isArticleAuthor={isArticleAuthor}
                isMine={currentUser?.id === s.author_id}
                active={focused === s.block_id}
                busy={busyId === s.id}
                onFocus={setFocused}
                onAccept={accept}
                onReject={reject}
                onWithdraw={withdraw}
                onBlock={isArticleAuthor ? block : undefined}
                currentUserId={currentUser?.id}
              />
            ))
          )}

          {!currentUser && (
            <div style={{ marginTop: 16, display: "flex", gap: 7, alignItems: "flex-start", color: C.inkFaint }}>
              <Clock size={13} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                Connectez-vous pour proposer une modification — votre brouillon est conservé.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", background: C.ink, color: C.paper, borderRadius: 9, padding: "10px 16px", display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 500, boxShadow: "0 12px 32px -14px rgba(23,25,28,.6)", zIndex: 50 }}
          >
            <toast.icon size={15} />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes flash { 0% { background: transparent; } 25% { background: ${C.acceptedSoft}; } 100% { background: transparent; } }
        .flash { animation: flash 1.4s var(--ease); border-radius: 5px; }
        .marker { opacity: 0; transform: translateX(-4px); transition: all .28s var(--ease); }
        .blk:hover .marker, .blk:focus-within .marker { opacity: 1; transform: none; }
        .blk a { color: var(--pencil); text-decoration: underline; text-underline-offset: 2px; }
        .blk ul, .blk ol { padding-left: 24px; margin: 0 0 20px; }
        .blk li { margin: 4px 0; }
        .blk img { max-width: 100%; height: auto; }
        @media (max-width: 900px) { .shell { grid-template-columns: 1fr !important; } .rail { border-left: none !important; padding-left: 0 !important; } }
      `}</style>
    </div>
  );
}

/**
 * Rend un bloc. Si `html` est présent (contenu riche : liens, gras…), on
 * l'injecte — il provient de l'éditeur Tiptap, limité à un schéma sûr. Sinon on
 * rend le texte brut (React échappe). Les images sont rendues en <img>.
 */
function renderBlock(b: Block, typo: React.CSSProperties) {
  if (b.type === "image") {
    // Images externes fournies par l'auteur : <img> volontaire (next/image
    // exigerait d'autoriser chaque hôte distant).
    // eslint-disable-next-line @next/next/no-img-element
    return b.text ? <img src={b.text} alt="" style={{ maxWidth: "100%", borderRadius: 8, display: "block", margin: "0 0 20px" }} /> : null;
  }
  if (b.type === "code") return <pre style={typo}>{b.text}</pre>;
  if (b.type === "h1") return <h1 style={typo}>{b.text}</h1>;
  if (b.type === "quote") {
    return b.html ? (
      <blockquote style={typo} dangerouslySetInnerHTML={{ __html: b.html }} />
    ) : (
      <blockquote style={typo}>{b.text}</blockquote>
    );
  }
  // Un <div> plutôt qu'un <p> pour accueillir aussi les listes (html de bloc).
  return b.html ? (
    <div style={typo} dangerouslySetInnerHTML={{ __html: b.html }} />
  ) : (
    <p style={typo}>{b.text}</p>
  );
}

function humanizeAcceptError(msg: string): string {
  if (msg.includes("stale") || msg.includes("block_changed")) return "Le bloc a changé entre-temps : proposition périmée.";
  if (msg.includes("not_open")) return "Cette proposition n'est plus ouverte.";
  if (msg.includes("not_authorized") || msg.includes("42501")) return "Action réservée à l'auteur de l'article.";
  return "Impossible d'accepter la proposition.";
}
