import { describe, it, expect } from "vitest";
import { extractMentions, tokenizeMentions, mentionQueryAtCaret } from "@/lib/mentions";

describe("extractMentions", () => {
  it("extrait les handles en minuscules, dédoublonnés", () => {
    expect(extractMentions("Merci @Yao et @selim, @yao !")).toEqual(["yao", "selim"]);
  });
  it("liste vide sans mention", () => {
    expect(extractMentions("Aucune mention ici.")).toEqual([]);
  });
  it("ignore un @ isolé", () => {
    expect(extractMentions("prix @ 5€")).toEqual([]);
  });
});

describe("tokenizeMentions", () => {
  it("sépare texte et mentions", () => {
    const tokens = tokenizeMentions("Salut @yao !");
    expect(tokens).toEqual([
      { text: "Salut ", handle: null },
      { text: "@yao", handle: "yao" },
      { text: " !", handle: null },
    ]);
  });
});

describe("mentionQueryAtCaret", () => {
  it("détecte un @token en cours de saisie avant le curseur", () => {
    const v = "coucou @sel";
    expect(mentionQueryAtCaret(v, v.length)).toEqual({ query: "sel", start: 7 });
  });
  it("détecte un @ vide (query vide) juste après la frappe de @", () => {
    const v = "coucou @";
    expect(mentionQueryAtCaret(v, v.length)).toEqual({ query: "", start: 7 });
  });
  it("null si le curseur n'est pas dans un token de mention", () => {
    const v = "coucou @yao merci";
    expect(mentionQueryAtCaret(v, v.length)).toBeNull();
  });
});
