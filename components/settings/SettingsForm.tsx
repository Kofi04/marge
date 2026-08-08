"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { C } from "@/lib/tokens";
import type { Profile } from "@/lib/types";
import { profileSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";

/** Édition du profil (handle, nom, bio). */
export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [handle, setHandle] = useState(profile.handle);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const parsed = profileSchema.safeParse({ handle, display_name: displayName, bio });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ handle: parsed.data.handle, display_name: parsed.data.display_name, bio: parsed.data.bio || null })
      .eq("id", profile.id);
    setBusy(false);
    if (updErr) {
      setError(updErr.code === "23505" ? "Ce handle est déjà pris." : updErr.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const field: React.CSSProperties = {
    border: `1px solid ${C.rule}`, borderRadius: 9, padding: "10px 12px", fontSize: 14,
    fontFamily: "inherit", background: C.field, outline: "none", color: C.ink, width: "100%", boxSizing: "border-box",
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 440 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>Handle</span>
        <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} style={field} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>Nom affiché</span>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={field} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>Bio</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" disabled={busy} style={{ background: C.ink, color: C.paper, border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.accepted, fontSize: 13 }}><Check size={14} /> Enregistré</span>}
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: C.delInk, background: C.del, padding: "9px 12px", borderRadius: 8 }}>{error}</p>}
    </form>
  );
}
