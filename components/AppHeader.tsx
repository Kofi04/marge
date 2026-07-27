import Link from "next/link";
import { Home, PenLine, Inbox, Settings, LogOut } from "lucide-react";
import { C } from "@/lib/tokens";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

/**
 * En-tête des pages authentifiées. Le logo et l'onglet Accueil ramènent à la
 * page d'accueil connectée (/home). La déconnexion passe par un POST /auth/signout.
 */
export function AppHeader({ profile, active }: { profile: Profile; active?: "home" | "write" | "review" | "settings" }) {
  const link = (href: string, label: string, Icon: typeof PenLine, key: string) => (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
        color: active === key ? C.ink : C.inkSoft, padding: "6px 10px", borderRadius: 7,
        background: active === key ? C.panel : "transparent",
      }}
    >
      <Icon size={14} /> {label}
    </Link>
  );

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(252,252,250,.88)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.rule}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <Link href="/home" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: "-.01em" }}>Marge</span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          {link("/home", "Accueil", Home, "home")}
          {link("/write", "Écrire", PenLine, "write")}
          {link("/review", "File", Inbox, "review")}
          {link("/settings", "Réglages", Settings, "settings")}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={`/@${profile.handle}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Avatar name={profile.display_name} size={26} />
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" title="Se déconnecter" style={{ display: "inline-flex", alignItems: "center", background: "none", border: "none", color: C.inkFaint, cursor: "pointer", padding: 4 }}>
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
