"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, Inbox } from "lucide-react";
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

  async function accept(item: ReviewItem) {
    setBusyId(item.id);
    const { error } = await supabase.rpc("accept_suggestion", { suggestion_id: item.id });
    setBusyId(null);
    setMsg(error ? "Impossible d'accepter (bloc modifié ?)." : `Révision publiée · ${item.author?.display_name ?? "contributeur"} crédité`);
    router.refresh();
  }

  async function reject(item: ReviewItem) {
    setBusyId(item.id);
    await supabase
      .from("suggestions")
      .update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by: userId })
      .eq("id", item.id);
    setBusyId(null);
    setMsg("Proposition refusée");
    router.refresh();
  }

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
      {msg && (
        <div style={{ fontSize: 13, color: C.accepted, background: C.acceptedSoft, borderRadius: 8, padding: "9px 12px" }}>{msg}</div>
      )}
      {items.map((s) => {
        const stale = s.resolved_status === "stale";
        return (
          <div key={s.id} style={{ border: `1px solid ${C.rule}`, borderLeft: `2px solid ${stale ? C.stale : C.pencil}`, borderRadius: 10, background: C.paper, padding: 15 }}>
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
