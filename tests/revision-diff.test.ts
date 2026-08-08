import { describe, it, expect } from "vitest";
import { diffRevisions, summarize } from "@/lib/revision-diff";
import type { Block } from "@/lib/types";

const b = (id: string, text: string): Block => ({ id, type: "p", text });

describe("diffRevisions", () => {
  it("bloc inchangé → status unchanged, sans diff", () => {
    const before = [b("b1", "Le bloc, pas la ligne.")];
    const { entries, removed, summary } = diffRevisions(before, before);
    expect(entries[0].status).toBe("unchanged");
    expect(entries[0].parts).toBeUndefined();
    expect(removed).toHaveLength(0);
    expect(summary).toEqual({ added: 0, removed: 0, modified: 0, moved: 0 });
  });

  it("bloc modifié → status modified + diff mot à mot", () => {
    const before = [b("b1", "Un texte simple.")];
    const after = [b("b1", "Un texte très simple.")];
    const { entries, summary } = diffRevisions(before, after);
    expect(entries[0].status).toBe("modified");
    expect(entries[0].before?.text).toBe("Un texte simple.");
    expect(entries[0].parts?.some((p) => p.type === "add" && p.value.includes("très"))).toBe(true);
    expect(summary.modified).toBe(1);
  });

  it("bloc ajouté → status added", () => {
    const before = [b("b1", "Premier.")];
    const after = [b("b1", "Premier."), b("b2", "Deuxième.")];
    const { entries, summary } = diffRevisions(before, after);
    expect(entries[1].status).toBe("added");
    expect(entries[1].before).toBeUndefined();
    expect(summary.added).toBe(1);
  });

  it("bloc retiré → présent dans removed", () => {
    const before = [b("b1", "Premier."), b("b2", "Deuxième.")];
    const after = [b("b1", "Premier.")];
    const { entries, removed, summary } = diffRevisions(before, after);
    expect(entries).toHaveLength(1);
    expect(removed.map((x) => x.id)).toEqual(["b2"]);
    expect(summary.removed).toBe(1);
  });

  it("bloc réordonné → status moved (un seul bloc bascule)", () => {
    const before = [b("b1", "A"), b("b2", "B"), b("b3", "C")];
    // b3 remonté en tête : b1 et b2 restent dans le même ordre relatif.
    const after = [b("b3", "C"), b("b1", "A"), b("b2", "B")];
    const { entries, summary } = diffRevisions(before, after);
    const moved = entries.find((e) => e.block.id === "b3");
    expect(moved?.status).toBe("moved");
    expect(summary.moved).toBe(1);
    // b1 et b2 restent stables (non déplacés).
    expect(entries.find((e) => e.block.id === "b1")?.status).toBe("unchanged");
  });

  it("un déplacement ne masque pas une modification simultanée", () => {
    const before = [b("b1", "A"), b("b2", "texte d'origine")];
    const after = [b("b2", "texte remanié"), b("b1", "A")];
    const { entries } = diffRevisions(before, after);
    // b2 a bougé ET changé → la modification prime (elle porte l'information utile).
    expect(entries.find((e) => e.block.id === "b2")?.status).toBe("modified");
  });
});

describe("summarize", () => {
  it("compose un résumé lisible et pluralise", () => {
    expect(summarize({ added: 1, removed: 0, modified: 2, moved: 0 })).toBe("2 modifiés · 1 ajouté");
  });

  it("chaîne vide si aucun changement", () => {
    expect(summarize({ added: 0, removed: 0, modified: 0, moved: 0 })).toBe("");
  });
});
