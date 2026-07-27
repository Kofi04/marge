import { StaticPage } from "@/components/StaticPage";

export const metadata = { title: "Confidentialité — Marge" };

export default function PrivacyPage() {
  return (
    <StaticPage title="Confidentialité">
      <p>
        Marge collecte le minimum nécessaire au fonctionnement du service : votre adresse
        e-mail (via l&apos;authentification), votre handle et votre nom affichés publiquement,
        et le contenu que vous publiez ou proposez.
      </p>
      <p>
        L&apos;authentification est gérée par Supabase. Vos données ne sont ni vendues ni
        partagées à des fins publicitaires. Vous pouvez exporter vos textes en Markdown à
        tout moment.
      </p>
      <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginTop: 28 }}>
        Document indicatif — à compléter avant une mise en production réelle.
      </p>
    </StaticPage>
  );
}
