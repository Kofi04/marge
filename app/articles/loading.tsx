import { C } from "@/lib/tokens";
import { HeaderSkeleton, Skeleton, CardListSkeleton } from "@/components/ui/Skeleton";

export default function ArticlesLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <HeaderSkeleton />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Skeleton w={180} h={30} />
          <Skeleton w={90} h={36} r={9} style={{ marginLeft: "auto" }} />
        </div>
        <CardListSkeleton count={3} />
      </main>
    </div>
  );
}
