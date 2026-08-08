import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

// Manrope pour l'interface, Newsreader pour le contenu des articles.
// Exposées en --font-manrope / --font-newsreader (mappées vers --font-sans /
// --font-serif dans globals.css).
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Marge — vos lecteurs corrigent dans la marge",
  description:
    "Plateforme de blog où les lecteurs proposent des modifications dans la marge. Vous acceptez, l'article gagne une révision, le contributeur gagne un crédit.",
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${manrope.variable} ${newsreader.variable}`}>
      <head>
        {/* Applique le thème avant le premier rendu (évite le flash de couleur). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('marge-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();",
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
