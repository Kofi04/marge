"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban } from "lucide-react";
import { C } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import type { BlockedUser } from "@/lib/blocks";

/** Liste des contributeurs bloqués, avec déblocage. */
export function BlockedUsersList({ userId, initial }: { userId: string; initial: BlockedUser[] }) {
  const supabase = createClient();
  const [list, setList] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function unblock(blockedId: string) {
    setBusyId(blockedId);
    const { error } = await supabase
      .from("author_blocks")
      .delete()
      .eq("author_id", userId)
      .eq("blocked_id", blockedId);
    setBusyId(null);
    if (!error) setList((l) => l.filter((u) => u.blocked_id !== blockedId));
  }

  if (list.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: C.inkFaint, margin: 0 }}>
        Aucun contributeur bloqué. Vous pouvez bloquer quelqu&apos;un depuis la marge d&apos;un de vos articles.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 440 }}>
      {list.map((u) => (
        <div key={u.blocked_id} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.rule}`, borderRadius: 10, padding: "10px 12px" }}>
          <Avatar name={u.display_name} size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.display_name}</div>
            {u.handle && <Link href={`/@${u.handle}`} style={{ fontSize: 12, color: C.inkFaint }}>@{u.handle}</Link>}
          </div>
          <button
            type="button"
            onClick={() => unblock(u.blocked_id)}
            disabled={busyId === u.blocked_id}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${C.rule}`, background: C.paper, borderRadius: 8, padding: "6px 10px", fontSize: 12.5, fontWeight: 600, color: C.ink, cursor: "pointer", fontFamily: "inherit", opacity: busyId === u.blocked_id ? 0.5 : 1 }}
          >
            <Ban size={13} /> Débloquer
          </button>
        </div>
      ))}
    </div>
  );
}
