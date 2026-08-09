import { C } from "@/lib/tokens";

/**
 * Primitives de squelette de chargement (server-safe : pas de hook). Utilisées
 * par les fichiers loading.tsx pour afficher un « wireframe » animé pendant que
 * les Server Components chargent leurs données — feedback immédiat à la navigation.
 */
export function Skeleton({
  w = "100%",
  h = 14,
  r = 8,
  mb,
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
  mb?: number;
  style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, marginBottom: mb, ...style }} />;
}

/** En-tête applicatif factice (mêmes proportions que AppHeader). */
export function HeaderSkeleton() {
  return (
    <header style={{ borderBottom: `1px solid ${C.rule}`, background: C.headerBg }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <Skeleton w={90} h={22} r={6} />
        <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
          <Skeleton w={64} h={20} r={7} />
          <Skeleton w={64} h={20} r={7} />
          <Skeleton w={64} h={20} r={7} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Skeleton w={26} h={26} r={13} />
        </div>
      </div>
    </header>
  );
}

/** Carte d'article factice (fil, recherche, tags). */
export function CardSkeleton() {
  return (
    <div style={{ border: `1px solid ${C.rule}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Skeleton w={20} h={20} r={10} />
        <Skeleton w={120} h={12} />
      </div>
      <Skeleton w="70%" h={20} mb={8} />
      <Skeleton w="95%" h={13} mb={5} />
      <Skeleton w="85%" h={13} />
    </div>
  );
}

/** Liste de cartes (n éléments). */
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}
