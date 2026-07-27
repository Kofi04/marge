import { StaticPage } from "@/components/StaticPage";

export const metadata = { title: "Journal des versions — Marge" };

export default function ChangelogPage() {
  return (
    <StaticPage title="Journal des versions">
      <p>Les évolutions notables de Marge apparaîtront ici.</p>
      <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
        <li>Contribution ancrée au bloc, diff mot à mot, acceptation atomique.</li>
        <li>Attribution : crédits sous l&apos;article et sur le profil, notifications.</li>
        <li>Éditeur avec liens, images et formatage riche ; export Markdown et partage.</li>
      </ul>
    </StaticPage>
  );
}
