import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { C } from "@/lib/tokens";

/** Gabarit simple pour les pages informatives (conditions, confidentialité…). */
export function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink }}>
      <header style={{ borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "11px 22px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>M</div>
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>Marge</span>
          </Link>
        </div>
      </header>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "40px 22px 90px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.inkFaint, fontSize: 13, marginBottom: 22 }}>
          <ArrowLeft size={14} /> Accueil
        </Link>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 22px" }}>{title}</h1>
        <div style={{ fontSize: 15, lineHeight: 1.7, color: C.inkSoft }}>{children}</div>
      </main>
    </div>
  );
}
