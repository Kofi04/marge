/**
 * Tokens de couleur de Marge, dupliqués depuis le prototype pour les rares
 * styles inline (couleurs passées à framer-motion, valeurs calculées en JS).
 * La source canonique reste les variables CSS de `app/globals.css` ; garder
 * les deux synchronisés.
 */
export const C = {
  paper: "#FCFCFA",
  panel: "#F4F4F0",
  ink: "#17191C",
  inkSoft: "#5E6167",
  inkFaint: "#9B9EA3",
  rule: "#E4E4DD",
  pencil: "#3B4CC0",
  pencilSoft: "#EDEFFB",
  accepted: "#1F7A55",
  acceptedSoft: "#E6F2EC",
  stale: "#A8630F",
  staleSoft: "#FBF0DF",
  del: "#FBE3E3",
  delInk: "#93312F",
  add: "#E1F1E7",
  addInk: "#1C6B4A",
} as const;

/** Courbe d'accélération partagée (reprise de EASE dans le prototype). */
export const EASE = [0.22, 1, 0.36, 1] as const;
