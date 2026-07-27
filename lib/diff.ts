/**
 * Diff mot à mot par plus longue sous-séquence commune (LCS).
 *
 * Porté tel quel depuis le prototype `marge-mvp.jsx` (source de vérité de la
 * logique métier). On compare des mots — et non des lignes — parce que l'unité
 * mentale d'une correction de prose est le mot dans un bloc, pas la ligne.
 */

export type DiffOp = "same" | "del" | "add";

export interface DiffPart {
  type: DiffOp;
  value: string;
}

/**
 * Découpe en tokens en conservant les espaces comme tokens à part entière,
 * de sorte que `tokens.join("")` reconstruit exactement la chaîne d'origine.
 */
export function tokenize(s: string): string[] {
  return s.split(/(\s+)/).filter((t) => t !== "");
}

/**
 * Renvoie la liste ordonnée des segments (`same` | `del` | `add`) qui
 * transforment `a` en `b`. Les segments consécutifs de même type sont fusionnés
 * pour un rendu compact.
 */
export function diffWords(a: string, b: string): DiffPart[] {
  const A = tokenize(a);
  const B = tokenize(b);
  const n = A.length;
  const m = B.length;

  // dp[i][j] = longueur de la LCS de A[i..] et B[j..]
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        A[i] === B[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffPart[] = [];
  const push = (type: DiffOp, value: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.value += value;
    else out.push({ type, value });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push("same", A[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("del", A[i]);
      i++;
    } else {
      push("add", B[j]);
      j++;
    }
  }
  while (i < n) {
    push("del", A[i]);
    i++;
  }
  while (j < m) {
    push("add", B[j]);
    j++;
  }
  return out;
}
