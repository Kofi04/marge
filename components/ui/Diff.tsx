"use client";

import { useMemo } from "react";
import { diffWords } from "@/lib/diff";

/**
 * Rendu du diff mot à mot. Repris du prototype : le texte inchangé est atténué,
 * les suppressions barrées sur fond rouge, les ajouts sur fond vert. Rendu en
 * Newsreader (var(--serif)) pour coller à la prose de l'article.
 */
export function Diff({
  from,
  to,
  size = 14.5,
}: {
  from: string;
  to: string;
  size?: number;
}) {
  const parts = useMemo(() => diffWords(from, to), [from, to]);
  return (
    <span
      style={{ fontFamily: "var(--serif)", fontSize: size, lineHeight: 1.65, color: "var(--ink)" }}
    >
      {parts.map((p, k) =>
        p.type === "same" ? (
          <span key={k} style={{ color: "var(--ink-soft)" }}>
            {p.value}
          </span>
        ) : (
          <span
            key={k}
            style={{
              background: p.type === "del" ? "var(--del)" : "var(--add)",
              color: p.type === "del" ? "var(--del-ink)" : "var(--add-ink)",
              textDecoration: p.type === "del" ? "line-through" : "none",
              textDecorationThickness: "1px",
              borderRadius: 3,
              padding: "1px 2px",
              margin: "0 -1px",
            }}
          >
            {p.value}
          </span>
        ),
      )}
    </span>
  );
}
