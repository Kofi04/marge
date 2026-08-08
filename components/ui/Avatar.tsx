import { C } from "@/lib/tokens";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Pastille d'initiales. Porté du prototype ; `tone="pencil"` met en avant un
 * contributeur (crédits, carte active).
 */
export function Avatar({
  name,
  size = 26,
  tone = "ink",
}: {
  name: string;
  size?: number;
  tone?: "ink" | "pencil";
}) {
  const bg = tone === "pencil" ? C.pencilSoft : C.panel;
  const fg = tone === "pencil" ? C.pencil : C.inkSoft;
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size, background: bg, color: fg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 600, letterSpacing: ".02em", flexShrink: 0,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
