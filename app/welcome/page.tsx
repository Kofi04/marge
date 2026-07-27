"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtSign, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { C } from "@/lib/tokens";
import { handleSchema, profileSchema } from "@/lib/schemas";

function WelcomeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/me";
  const supabase = createClient();

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Préremplit le nom depuis le profil provisoire créé au signup.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/welcome")}`);
        return;
      }
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      if (data?.display_name) setDisplayName(data.display_name);
    })();
  }, [router, supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = profileSchema.safeParse({ handle, display_name: displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      router.replace("/login");
      return;
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ handle: parsed.data.handle, display_name: parsed.data.display_name })
      .eq("id", user.id);

    setBusy(false);
    if (updErr) {
      // 23505 = violation de contrainte unique (handle déjà pris).
      setError(updErr.code === "23505" ? "Ce handle est déjà pris." : updErr.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const handleValid = handleSchema.safeParse(handle).success;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.paper, padding: 22 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, margin: "0 0 8px", letterSpacing: "-.02em" }}>
          Bienvenue sur Marge
        </h1>
        <p style={{ fontSize: 14.5, color: C.inkSoft, margin: "0 0 26px", lineHeight: 1.55 }}>
          Choisissez votre handle public — il apparaîtra dans les crédits des articles
          que vous améliorez et sur votre profil.
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>Handle</span>
            <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.rule}`, borderRadius: 9, background: "#fff", paddingLeft: 11 }}>
              <AtSign size={15} color={C.inkFaint} />
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="votre-handle"
                autoFocus
                style={{ flex: 1, border: "none", outline: "none", padding: "11px 11px", fontSize: 14, fontFamily: "inherit", background: "transparent", color: C.ink }}
              />
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>Nom affiché</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom"
              style={{ border: `1px solid ${C.rule}`, borderRadius: 9, padding: "11px 13px", fontSize: 14, fontFamily: "inherit", background: "#fff", outline: "none", color: C.ink }}
            />
          </label>

          <button
            type="submit"
            disabled={busy || !handleValid || !displayName.trim()}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: C.ink, color: C.paper, border: "none", borderRadius: 9, padding: "12px 13px",
              fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              opacity: busy || !handleValid || !displayName.trim() ? 0.5 : 1,
            }}
          >
            {busy ? "Enregistrement…" : "Continuer"} <ArrowRight size={15} />
          </button>
        </form>

        {error && (
          <p style={{ marginTop: 16, fontSize: 13, color: C.delInk, background: C.del, padding: "9px 12px", borderRadius: 8 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeInner />
    </Suspense>
  );
}
