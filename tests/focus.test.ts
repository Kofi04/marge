import { describe, it, expect } from "vitest";
import { focusRangeFromDiff, focusExcerpt } from "@/lib/focus";

describe("focusRangeFromDiff", () => {
  it("textes identiques → null", () => {
    expect(focusRangeFromDiff("Le bloc.", "Le bloc.")).toBeNull();
  });

  it("remplacement d'un mot → plage couvrant le mot d'origine", () => {
    const r = focusRangeFromDiff("Le chat dort.", "Le chien dort.");
    expect(r).not.toBeNull();
    expect("Le chat dort.".slice(r!.start, r!.end)).toBe("chat");
  });

  it("suppression → plage couvrant le segment retiré", () => {
    const r = focusRangeFromDiff("a b c", "a c");
    expect(r).not.toBeNull();
    // La plage inclut le « b » retiré (index 2).
    expect(r!.start).toBeLessThanOrEqual(2);
    expect(r!.end).toBeGreaterThanOrEqual(3);
  });

  it("insertion pure → plage de largeur nulle au point d'insertion", () => {
    const r = focusRangeFromDiff("Un texte simple.", "Un texte très simple.");
    expect(r).not.toBeNull();
    expect(r!.start).toBe(r!.end);
  });
});

describe("focusExcerpt", () => {
  it("rend l'extrait autour de la région visée", () => {
    const excerpt = focusExcerpt("Le chat dort.", { start: 3, end: 7 });
    expect(excerpt).toBe("Le chat dort.");
  });

  it("tronque avec des points de suspension au-delà du contexte", () => {
    const long = "Phrase une. Phrase deux. Phrase trois avec le mot visé ici. Phrase quatre. Phrase cinq.";
    const idx = long.indexOf("visé");
    const excerpt = focusExcerpt(long, { start: idx, end: idx + 4 }, 10);
    expect(excerpt.startsWith("… ")).toBe(true);
    expect(excerpt.endsWith(" …")).toBe(true);
    expect(excerpt).toContain("visé");
  });

  it("élargit une plage vide au mot englobant", () => {
    const text = "Un texte simple.";
    // plage vide au début de « simple »
    const excerpt = focusExcerpt(text, { start: 9, end: 9 }, 0);
    expect(excerpt).toContain("simple");
  });
});
