import { describe, it, expect } from "vitest";
import { escapeXml, toRfc822, buildRss } from "@/lib/rss";

describe("escapeXml", () => {
  it("échappe les caractères réservés", () => {
    expect(escapeXml(`Tom & "Jerry" <b>'x'`)).toBe("Tom &amp; &quot;Jerry&quot; &lt;b&gt;&apos;x&apos;");
  });
});

describe("toRfc822", () => {
  it("convertit une date ISO en RFC-822 (UTC)", () => {
    expect(toRfc822("2026-08-08T00:00:00Z")).toBe("Sat, 08 Aug 2026 00:00:00 GMT");
  });
  it("renvoie une chaîne vide pour une valeur absente ou invalide", () => {
    expect(toRfc822(null)).toBe("");
    expect(toRfc822("pas-une-date")).toBe("");
  });
});

describe("buildRss", () => {
  const xml = buildRss({
    title: "Marge",
    description: "Fil",
    siteUrl: "https://marge.app",
    feedUrl: "https://marge.app/rss.xml",
    items: [
      { title: "Titre & co", link: "https://marge.app/@a/x", guid: "https://marge.app/@a/x", description: "chapô", pubDate: "2026-08-08T00:00:00Z" },
    ],
  });

  it("produit un document RSS 2.0 valide dans sa structure", () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("<link>https://marge.app/@a/x</link>");
  });

  it("échappe le contenu des items (pas d'injection XML)", () => {
    expect(xml).toContain("<title>Titre &amp; co</title>");
    expect(xml).not.toContain("Titre & co");
  });

  it("omet description/pubDate absents", () => {
    const bare = buildRss({
      title: "T", description: "D", siteUrl: "s", feedUrl: "f",
      items: [{ title: "x", link: "l", guid: "g" }],
    });
    expect(bare).not.toContain("<description></description>");
    expect(bare).not.toContain("<pubDate>");
  });
});
