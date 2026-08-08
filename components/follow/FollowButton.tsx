"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { C } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/client";

/**
 * Bouton « Suivre / Suivi ». Auto-chargé côté client : il lit la session et
 * l'état de suivi au montage, ce qui laisse la page profil en cache ISR
 * (aucune donnée par-visiteur rendue côté serveur).
 *
 * `onFollowChange` permet au parent d'ajuster le compteur d'abonnés en optimiste.
 */
export function FollowButton({
  targetId,
  size = "md",
  onFollowChange,
}: {
  targetId: string;
  size?: "sm" | "md";
  onFollowChange?: (delta: 1 | -1) => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (!active) return;
      setViewerId(uid);
      if (uid && uid !== targetId) {
        const { data } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", uid)
          .eq("following_id", targetId)
          .maybeSingle();
        if (active) setFollowing(!!data);
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [supabase, targetId]);

  // On ne peut pas se suivre soi-même : rien à afficher.
  if (ready && viewerId === targetId) return null;

  async function toggle() {
    if (!viewerId) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    setBusy(true);
    if (following) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", viewerId).eq("following_id", targetId);
      if (!error) { setFollowing(false); onFollowChange?.(-1); }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: viewerId, following_id: targetId });
      if (!error) { setFollowing(true); onFollowChange?.(1); }
    }
    setBusy(false);
  }

  const pad = size === "sm" ? "5px 11px" : "8px 14px";
  const fs = size === "sm" ? 12.5 : 13.5;
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: pad, borderRadius: 9,
    fontSize: fs, fontWeight: 600, cursor: busy ? "default" : "pointer", fontFamily: "inherit",
    border: `1px solid ${following ? C.rule : C.ink}`,
    background: following ? C.paper : C.ink,
    color: following ? C.ink : C.paper,
    opacity: ready ? (busy ? 0.6 : 1) : 0.5,
  };

  return (
    <button type="button" onClick={toggle} disabled={busy || !ready} style={style}>
      {following ? <><UserCheck size={14} /> Suivi</> : <><UserPlus size={14} /> Suivre</>}
    </button>
  );
}
