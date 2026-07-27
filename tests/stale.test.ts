import { describe, it, expect } from "vitest";
import { resolveStatus, resolveSuggestions } from "@/lib/stale";
import type { Block, Suggestion } from "@/lib/types";

const blocks: Block[] = [
  { id: "b3", type: "p", text: "Texte original du bloc b3." },
  { id: "b6", type: "p", text: "Texte original du bloc b6." },
];

function makeSuggestion(over: Partial<Suggestion>): Suggestion {
  return {
    id: "s1",
    article_id: "a1",
    block_id: "b3",
    base_revision_id: "r1",
    original_text: "Texte original du bloc b3.",
    proposed_text: "Texte proposé.",
    reason: null,
    kind: "edit",
    status: "open",
    author_id: "u1",
    resolved_at: null,
    resolved_by: null,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("resolveStatus", () => {
  it("open + bloc inchangé → reste open, non périmé", () => {
    const s = makeSuggestion({});
    expect(resolveStatus(s, blocks)).toEqual({
      resolved_status: "open",
      is_stale: false,
    });
  });

  it("open + bloc modifié depuis → périmé", () => {
    const s = makeSuggestion({});
    const changed: Block[] = [
      { id: "b3", type: "p", text: "Le paragraphe a été réécrit entre-temps." },
      blocks[1],
    ];
    expect(resolveStatus(s, changed)).toEqual({
      resolved_status: "stale",
      is_stale: true,
    });
  });

  it("détection du périmé après publication d'une révision touchant le bloc", () => {
    // Simule le critère de recette : une 2e suggestion en attente sur un
    // paragraphe qui vient de changer bascule en « périmée ».
    const pending = makeSuggestion({ id: "s2", original_text: "Texte original du bloc b3." });
    const afterRevision: Block[] = [
      { id: "b3", type: "p", text: "Texte original du bloc b3, désormais amélioré." },
      blocks[1],
    ];
    expect(resolveStatus(pending, afterRevision).is_stale).toBe(true);
  });

  it("statut non-open (accepted/rejected/withdrawn) → jamais périmé", () => {
    for (const status of ["accepted", "rejected", "withdrawn"] as const) {
      const s = makeSuggestion({ status });
      const changed: Block[] = [{ id: "b3", type: "p", text: "changé" }, blocks[1]];
      expect(resolveStatus(s, changed)).toEqual({
        resolved_status: status,
        is_stale: false,
      });
    }
  });

  it("bloc absent de la révision → non périmé (rien à comparer)", () => {
    const s = makeSuggestion({ block_id: "b99" });
    expect(resolveStatus(s, blocks).is_stale).toBe(false);
  });
});

describe("resolveSuggestions", () => {
  it("enrichit chaque suggestion de resolved_status et is_stale", () => {
    const list = [makeSuggestion({ id: "s1" }), makeSuggestion({ id: "s2", block_id: "b6", original_text: "obsolète" })];
    const resolved = resolveSuggestions(list, blocks);
    expect(resolved[0].is_stale).toBe(false);
    expect(resolved[1].is_stale).toBe(true);
    expect(resolved[1].resolved_status).toBe("stale");
  });
});
