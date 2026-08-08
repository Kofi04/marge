import { describe, it, expect } from "vitest";
import { normalizeQuery, normalizeTag } from "@/lib/search";
import { tagSchema } from "@/lib/schemas";

describe("normalizeQuery", () => {
  it("réduit les espaces et coupe les bords", () => {
    expect(normalizeQuery("  le   bloc  ")).toBe("le bloc");
  });
  it("chaîne vide si uniquement des espaces", () => {
    expect(normalizeQuery("   ")).toBe("");
  });
});

describe("normalizeTag", () => {
  it("met en minuscules et coupe les bords", () => {
    expect(normalizeTag("  Design  ")).toBe("design");
  });
});

describe("tagSchema", () => {
  it("accepte un tag valide", () => {
    expect(tagSchema.safeParse("écriture-web").success).toBe(false); // les accents ne sont pas autorisés
    expect(tagSchema.safeParse("ux-design").success).toBe(true);
  });
  it("rejette trop court ou caractères invalides", () => {
    expect(tagSchema.safeParse("a").success).toBe(false);
    expect(tagSchema.safeParse("a b").success).toBe(false);
  });
  it("normalise en minuscules", () => {
    const parsed = tagSchema.parse("Produit");
    expect(parsed).toBe("produit");
  });
});
