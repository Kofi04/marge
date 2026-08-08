/**
 * Génération de flux RSS 2.0. Aucune dépendance : on assemble le XML à la main,
 * en échappant strictement le contenu inséré (titres, chapôs venant des auteurs).
 */

export interface RssItem {
  title: string;
  link: string;
  description?: string | null;
  pubDate?: string | null; // ISO ; converti en RFC-822
  guid: string;
}

export interface RssChannel {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  items: RssItem[];
}

/** Échappe les caractères réservés XML. */
export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[c]!));
}

/** ISO → date RFC-822 (format exigé par RSS). Chaîne vide si absente/invalide. */
export function toRfc822(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toUTCString();
}

/** Assemble un document RSS 2.0 complet. */
export function buildRss(channel: RssChannel): string {
  const items = channel.items
    .map((it) => {
      const date = toRfc822(it.pubDate);
      return [
        "    <item>",
        `      <title>${escapeXml(it.title)}</title>`,
        `      <link>${escapeXml(it.link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(it.guid)}</guid>`,
        it.description ? `      <description>${escapeXml(it.description)}</description>` : "",
        date ? `      <pubDate>${date}</pubDate>` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.siteUrl)}</link>
    <description>${escapeXml(channel.description)}</description>
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

/** Base URL du site (env, défaut dev). Sans slash final. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321").replace(/\/$/, "");
}
