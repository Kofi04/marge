import { describe, it, expect } from "vitest";
import { diffWords, tokenize, type DiffPart } from "@/lib/diff";

/** Reconstruit la chaîne cible à partir des segments non supprimés. */
function rebuildTarget(parts: DiffPart[]): string {
  return parts
    .filter((p) => p.type !== "del")
    .map((p) => p.value)
    .join("");
}

/** Reconstruit la chaîne source à partir des segments non ajoutés. */
function rebuildSource(parts: DiffPart[]): string {
  return parts
    .filter((p) => p.type !== "add")
    .map((p) => p.value)
    .join("");
}

describe("tokenize", () => {
  it("conserve les espaces pour permettre une reconstruction exacte", () => {
    const s = "un  deux\ttrois";
    expect(tokenize(s).join("")).toBe(s);
  });

  it("renvoie un tableau vide pour une chaîne vide", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("diffWords", () => {
  it("texte identique → tout en 'same', aucun del/add", () => {
    const s = "le bloc et pas la ligne";
    const parts = diffWords(s, s);
    expect(parts.every((p) => p.type === "same")).toBe(true);
    expect(parts.map((p) => p.value).join("")).toBe(s);
  });

  it("insertion pure → un segment 'add', le reste 'same'", () => {
    const from = "le bloc et la ligne";
    const to = "le bloc et pas la ligne";
    const parts = diffWords(from, to);
    expect(parts.some((p) => p.type === "add")).toBe(true);
    expect(parts.some((p) => p.type === "del")).toBe(false);
    expect(rebuildSource(parts)).toBe(from);
    expect(rebuildTarget(parts)).toBe(to);
  });

  it("suppression pure → un segment 'del', aucun 'add'", () => {
    const from = "le bloc et pas la ligne";
    const to = "le bloc et la ligne";
    const parts = diffWords(from, to);
    expect(parts.some((p) => p.type === "del")).toBe(true);
    expect(parts.some((p) => p.type === "add")).toBe(false);
    expect(rebuildSource(parts)).toBe(from);
    expect(rebuildTarget(parts)).toBe(to);
  });

  it("remplacement → del suivi d'add, reconstruction exacte des deux côtés", () => {
    const from = "deux personnes qui touchent la ligne";
    const to = "deux personnes qui modifient la ligne";
    const parts = diffWords(from, to);
    expect(parts.some((p) => p.type === "del")).toBe(true);
    expect(parts.some((p) => p.type === "add")).toBe(true);
    expect(rebuildSource(parts)).toBe(from);
    expect(rebuildTarget(parts)).toBe(to);
  });

  it("chaîne vide en cible → tout supprimé", () => {
    const from = "un texte à effacer";
    const parts = diffWords(from, "");
    expect(parts.every((p) => p.type === "del")).toBe(true);
    expect(rebuildSource(parts)).toBe(from);
    expect(rebuildTarget(parts)).toBe("");
  });

  it("chaîne vide en source → tout ajouté", () => {
    const to = "un texte à écrire";
    const parts = diffWords("", to);
    expect(parts.every((p) => p.type === "add")).toBe(true);
    expect(rebuildTarget(parts)).toBe(to);
  });

  it("deux chaînes vides → aucun segment", () => {
    expect(diffWords("", "")).toEqual([]);
  });
});
