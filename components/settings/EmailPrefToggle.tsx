"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { C } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/client";

/**
 * Interrupteur « notifications par e-mail ». Écrit directement
 * `profiles.email_notifications` (la RLS limite la mise à jour à soi-même).
 * L'Edge Function `notify-email` lit cette préférence avant d'envoyer.
 */
export function EmailPrefToggle({ userId, initial }: { userId: string; initial: boolean }) {
  const supabase = createClient();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setOn(next); // optimiste
    setBusy(true);
    setError(null);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ email_notifications: next })
      .eq("id", userId);
    setBusy(false);
    if (updErr) {
      setOn(!next); // rollback
      setError(updErr.message);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, border: `1px solid ${C.rule}`, borderRadius: 10, padding: "14px 16px", maxWidth: 440 }}>
      <Mail size={18} style={{ color: C.inkSoft, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Notifications par e-mail</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft }}>Recevez un e-mail à chaque proposition et acceptation.</div>
        {error && <div style={{ fontSize: 12, color: C.delInk, marginTop: 4 }}>{error}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        disabled={busy}
        style={{
          position: "relative", width: 42, height: 24, borderRadius: 12, border: "none", cursor: busy ? "default" : "pointer",
          background: on ? C.pencil : C.rule, transition: "background .18s", flexShrink: 0, opacity: busy ? 0.7 : 1,
        }}
      >
        <span
          style={{
            position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: 9,
            background: C.paper, transition: "left .18s", boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          }}
        />
      </button>
    </div>
  );
}
