/**
 * Tokens de couleur de Marge. Chaque valeur pointe vers une variable CSS définie
 * dans `app/globals.css` (clair par défaut, sombre sous `[data-theme="dark"]`).
 * Utiliser `C.*` dans les styles inline suit donc automatiquement le thème.
 *
 * (Auparavant ces valeurs étaient des hex en dur, ce qui figeait le thème clair.)
 */
export const C = {
  paper: "var(--paper)",
  panel: "var(--panel)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  inkFaint: "var(--ink-faint)",
  rule: "var(--rule)",
  ruleStrong: "var(--rule-strong)", // bordure de survol (ex-#C9CBD2)
  pencil: "var(--pencil)",
  pencilSoft: "var(--pencil-soft)",
  accepted: "var(--accepted)",
  acceptedSoft: "var(--accepted-soft)",
  stale: "var(--stale)",
  staleSoft: "var(--stale-soft)",
  del: "var(--del)",
  delInk: "var(--del-ink)",
  add: "var(--add)",
  addInk: "var(--add-ink)",
  field: "var(--field)",          // fond des champs (ex-#fff)
  headerBg: "var(--header-bg)",   // fond translucide des en-têtes collants
} as const;

/** Courbe d'accélération partagée (reprise de EASE dans le prototype). */
export const EASE = [0.22, 1, 0.36, 1] as const;
