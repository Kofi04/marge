"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { C } from "@/lib/tokens";

type Variant = "ghost" | "solid" | "accept" | "outline";

/** Bouton porté du prototype, avec ses quatre variantes et l'effet de survol. */
export function Btn({
  children,
  onClick,
  variant = "ghost",
  icon: Icon,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const [hov, setHov] = useState(false);
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid transparent",
    borderRadius: 7, padding: "7px 11px", fontSize: 13, fontWeight: 500, cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit", transition: "all .2s", opacity: disabled ? 0.4 : 1,
  };
  const styles: Record<Variant, React.CSSProperties> = {
    solid: { background: hov ? "#0E1013" : C.ink, color: C.paper, transform: hov ? "translateY(-1px)" : "none" },
    accept: { background: hov ? "#1A6949" : C.accepted, color: "#fff", transform: hov ? "translateY(-1px)" : "none" },
    outline: { background: hov ? C.panel : "transparent", color: C.ink, borderColor: C.rule },
    ghost: { background: hov ? C.panel : "transparent", color: C.inkSoft },
  };
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...base, ...styles[variant] }}
    >
      {Icon && <Icon size={14} strokeWidth={2} />}
      {children}
    </button>
  );
}
