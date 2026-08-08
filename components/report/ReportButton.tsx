"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Check } from "lucide-react";
import { C } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/client";
import type { ReportTargetType } from "@/lib/types";

/**
 * Signale une suggestion ou un article. Insère dans `reports` (RLS : le signaleur
 * insère pour lui-même ; l'auteur concerné peut lire). La raison est optionnelle.
 */
export function ReportButton({
  targetType,
  targetId,
  compact = false,
}: {
  targetType: ReportTargetType;
  targetId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function report() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    const reason = window.prompt("Signaler ce contenu — raison (optionnel) :", "");
    if (reason === null) return; // annulé
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: reason.trim() || null,
    });
    setBusy(false);
    if (!error) setDone(true);
  }

  if (done) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: C.accepted }}>
        <Check size={12} /> Signalé
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={report}
      disabled={busy}
      title="Signaler"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none",
        cursor: busy ? "default" : "pointer", color: C.inkFaint, fontFamily: "inherit",
        fontSize: 11.5, padding: compact ? 2 : "2px 4px",
      }}
    >
      <Flag size={compact ? 13 : 12} /> {compact ? "" : "Signaler"}
    </button>
  );
}
