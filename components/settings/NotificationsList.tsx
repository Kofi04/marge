"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, Sparkles, X, MessageSquare } from "lucide-react";
import { C } from "@/lib/tokens";
import type { NotificationView } from "@/lib/notifications";
import type { NotificationKind } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { createClient } from "@/lib/supabase/client";

const ICON: Record<NotificationKind, typeof Bell> = {
  suggestion_received: MessageSquare,
  suggestion_accepted: Sparkles,
  suggestion_rejected: X,
  comment: MessageSquare,
};

const COLOR: Record<NotificationKind, string> = {
  suggestion_received: C.pencil,
  suggestion_accepted: C.accepted,
  suggestion_rejected: C.stale,
  comment: C.inkSoft,
};

export function NotificationsList({ items, userId }: { items: NotificationView[]; userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    setBusy(true);
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null);
    setBusy(false);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div style={{ border: `1px dashed ${C.rule}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
        <Bell size={20} color={C.inkFaint} />
        <p style={{ margin: "10px 0 0", fontSize: 13.5, color: C.inkSoft }}>Aucune notification pour l&apos;instant.</p>
      </div>
    );
  }

  return (
    <div>
      {unread > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={markAllRead} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.rule}`, borderRadius: 7, padding: "5px 10px", fontSize: 12.5, color: C.inkSoft, cursor: "pointer", fontFamily: "inherit" }}>
            <Check size={13} /> Tout marquer comme lu
          </button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((n) => {
          const Icon = ICON[n.kind] ?? Bell;
          const body = (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px", background: n.read_at ? C.paper : C.pencilSoft, border: `1px solid ${C.rule}`, borderRadius: 10 }}>
              <Icon size={15} color={COLOR[n.kind] ?? C.inkSoft} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5, color: C.ink }}>{n.text}</span>
              <span style={{ fontSize: 11.5, color: C.inkFaint, whiteSpace: "nowrap" }}>{timeAgo(n.created_at)}</span>
            </div>
          );
          return n.href ? (
            <Link key={n.id} href={n.href}>{body}</Link>
          ) : (
            <div key={n.id}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
