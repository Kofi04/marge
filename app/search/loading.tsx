import { C } from "@/lib/tokens";
import { HeaderSkeleton, Skeleton, CardListSkeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <HeaderSkeleton />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        <Skeleton w={160} h={28} mb={20} />
        <Skeleton w="100%" h={42} r={10} mb={26} />
        <CardListSkeleton count={3} />
      </main>
    </div>
  );
}
