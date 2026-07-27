import { StaticPage } from "@/components/StaticPage";

export const metadata = { title: "Conditions — Marge" };

export default function LegalPage() {
  return (
    <StaticPage title="Conditions d'utilisation">
      <p>
        Marge est une plateforme de blog où les lecteurs proposent des modifications aux
        articles, que l&apos;auteur accepte ou refuse. En utilisant le service, vous acceptez
        de contribuer de bonne foi et de respecter le travail des auteurs.
      </p>
      <p>
        Vous conservez la propriété de vos textes. Les contributions acceptées sont
        attribuées publiquement à leur auteur, dans les crédits de l&apos;article et sur son
        profil.
      </p>
      <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginTop: 28 }}>
        Document indicatif — à compléter avant une mise en production réelle.
      </p>
    </StaticPage>
  );
}
