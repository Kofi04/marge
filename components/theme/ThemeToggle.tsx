"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { C } from "@/lib/tokens";

type Theme = "light" | "dark";

/**
 * Bascule clair / sombre. La préférence est lue au montage (localStorage, sinon
 * préférence système) ; le script inline du layout l'applique avant le premier
 * rendu (pas de flash). On persiste dans localStorage.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("marge-theme") as Theme | null;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("marge-theme", next);
    } catch {
      /* stockage indisponible : la bascule reste valable pour la session */
    }
  }

  const label = theme === "dark" ? "Passer en clair" : "Passer en sombre";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: compact ? 30 : 34, height: compact ? 30 : 34, borderRadius: 8,
        border: `1px solid ${C.rule}`, background: C.paper, color: C.inkSoft, cursor: "pointer",
      }}
    >
      {/* Avant hydratation (theme null) : icône neutre pour éviter tout saut. */}
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
