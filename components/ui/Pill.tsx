import { C } from "@/lib/tokens";

type Tone = "typo" | "edit" | "stale" | "accepted";

const MAP: Record<Tone, { bg: string; fg: string }> = {
  typo: { bg: C.panel, fg: C.inkSoft },
  edit: { bg: C.pencilSoft, fg: C.pencil },
  stale: { bg: C.staleSoft, fg: C.stale },
  accepted: { bg: C.acceptedSoft, fg: C.accepted },
};

/** Étiquette de statut (correction / réécriture / périmée / intégrée). */
export function Pill({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  const s = MAP[tone];
  return (
    <span
      style={{
        background: s.bg, color: s.fg, fontSize: 10.5, fontWeight: 600,
        letterSpacing: ".04em", textTransform: "uppercase",
        padding: "3px 7px", borderRadius: 4, whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
