import { describe, it, expect } from "vitest";
import { markdownToBlocks, inlineToHtml, inlineToText } from "@/lib/markdown-import";

describe("inlineToHtml", () => {
  it("gras, italique, code, lien", () => {
    expect(inlineToHtml("un **gras** et *ital* et `code`")).toBe("un <strong>gras</strong> et <em>ital</em> et <code>code</code>");
    expect(inlineToHtml("voir [Marge](https://marge.app)")).toBe('voir <a href="https://marge.app">Marge</a>');
  });
  it("échappe le HTML", () => {
    expect(inlineToHtml("a < b & c")).toBe("a &lt; b &amp; c");
  });
});

describe("inlineToText", () => {
  it("retire les marqueurs", () => {
    expect(inlineToText("un **gras** et [lien](u)")).toBe("un gras et lien");
  });
});

describe("markdownToBlocks", () => {
  it("titre → h1", () => {
    const [b] = markdownToBlocks("# Mon titre");
    expect(b.type).toBe("h1");
    expect(b.text).toBe("Mon titre");
  });

  it("paragraphe multi-lignes fusionné, avec html si formatage", () => {
    const [b] = markdownToBlocks("Une phrase **forte**\nsur deux lignes.");
    expect(b.type).toBe("p");
    expect(b.text).toBe("Une phrase forte sur deux lignes.");
    expect(b.html).toContain("<strong>forte</strong>");
  });

  it("paragraphe simple sans formatage n'a pas de html", () => {
    const [b] = markdownToBlocks("Texte tout simple.");
    expect(b.html).toBeUndefined();
  });

  it("citation > …", () => {
    const [b] = markdownToBlocks("> une citation\n> sur deux lignes");
    expect(b.type).toBe("quote");
    expect(b.text).toBe("une citation sur deux lignes");
  });

  it("bloc de code ```", () => {
    const [b] = markdownToBlocks("```\nconst x = 1;\nconst y = 2;\n```");
    expect(b.type).toBe("code");
    expect(b.text).toBe("const x = 1;\nconst y = 2;");
    expect(b.html).toBeUndefined();
  });

  it("liste à puces → p avec html <ul>", () => {
    const [b] = markdownToBlocks("- un\n- deux\n- trois");
    expect(b.type).toBe("p");
    expect(b.html).toBe("<ul><li>un</li><li>deux</li><li>trois</li></ul>");
    expect(b.text).toBe("un\ndeux\ntrois");
  });

  it("liste numérotée → <ol>", () => {
    const [b] = markdownToBlocks("1. un\n2. deux");
    expect(b.html).toBe("<ol><li>un</li><li>deux</li></ol>");
  });

  it("document mixte : ids uniques et ordre préservé", () => {
    const blocks = markdownToBlocks("# Titre\n\nUn paragraphe.\n\n> Citation\n\n- a\n- b");
    expect(blocks.map((b) => b.type)).toEqual(["h1", "p", "quote", "p"]);
    expect(new Set(blocks.map((b) => b.id)).size).toBe(blocks.length);
  });
});
