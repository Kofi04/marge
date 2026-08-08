"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { C } from "@/lib/tokens";
import { GithubMark } from "@/components/ui/GithubMark";

function siteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  // Destination par défaut = l'espace de l'utilisateur (/me), pas la landing.
  const next = params.get("next") || "/me";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<null | "github" | "google" | "email">(null);
  const [error, setError] = useState<string | null>(params.get("error"));

  // Déjà connecté : on ne reste pas coincé sur /login, on repart vers la destination.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace(next);
        router.refresh();
      }
    });
  }, [supabase, router, next]);

  const redirectTo = `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

  async function signInOAuth(provider: "github" | "google") {
    setError(null);
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
    // En cas de succès, le navigateur est redirigé vers le provider.
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.paper, padding: 22 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.inkFaint, fontSize: 13, marginBottom: 28 }}>
          <ArrowLeft size={14} /> Retour
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800 }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Marge</span>
        </div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, margin: "0 0 24px", letterSpacing: "-.02em" }}>
          Se connecter ou créer un compte
        </h1>

        {sent ? (
          <div style={{ border: `1px solid ${C.rule}`, borderRadius: 11, padding: 20, background: C.acceptedSoft }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.accepted, fontWeight: 600, marginBottom: 6 }}>
              <Check size={16} /> Lien envoyé
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55 }}>
              Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>. Ouvrez-le
              pour continuer — vous pouvez fermer cet onglet.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => signInOAuth("github")}
                disabled={!!busy}
                className="oauth"
                style={oauthBtn}
              >
                <GithubMark size={16} /> Continuer avec GitHub
              </button>
              <button
                onClick={() => signInOAuth("google")}
                disabled={!!busy}
                className="oauth"
                style={oauthBtn}
              >
                <GoogleMark /> Continuer avec Google
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: C.inkFaint, fontSize: 12 }}>
              <span style={{ flex: 1, height: 1, background: C.rule }} /> ou <span style={{ flex: 1, height: 1, background: C.rule }} />
            </div>

            <form onSubmit={signInEmail} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                style={{
                  border: `1px solid ${C.rule}`, borderRadius: 9, padding: "11px 13px",
                  fontSize: 14, fontFamily: "inherit", background: C.field, outline: "none", color: C.ink,
                }}
              />
              <button
                type="submit"
                disabled={!!busy}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: C.ink, color: C.paper, border: "none", borderRadius: 9, padding: "11px 13px",
                  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
                }}
              >
                <Mail size={15} /> {busy === "email" ? "Envoi…" : "Recevoir un lien magique"}
              </button>
            </form>
          </>
        )}

        {error && (
          <p style={{ marginTop: 16, fontSize: 13, color: C.delInk, background: C.del, padding: "9px 12px", borderRadius: 8 }}>
            {error}
          </p>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: C.inkFaint, lineHeight: 1.55 }}>
          En continuant, vous acceptez les conditions d&apos;utilisation. Aucune carte bancaire demandée.
        </p>
      </div>

      <style>{`
        .oauth:hover:not(:disabled) { background: ${C.panel} !important; }
      `}</style>
    </div>
  );
}

const oauthBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
  border: `1px solid ${C.rule}`, borderRadius: 9, padding: "11px 13px", fontSize: 14, fontWeight: 500,
  background: C.paper, color: C.ink, cursor: "pointer", fontFamily: "inherit", transition: "background .2s",
};

function GoogleMark() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
