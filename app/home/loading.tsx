import { C } from "@/lib/tokens";
import { HeaderSkeleton, Skeleton, CardListSkeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <HeaderSkeleton />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        <div style={{ border: `1px solid ${C.rule}`, borderRadius: 14, padding: 24, marginBottom: 34 }}>
          <Skeleton w={160} h={12} mb={12} />
          <Skeleton w="80%" h={26} mb={12} />
          <Skeleton w="95%" h={14} mb={6} />
          <Skeleton w="60%" h={14} mb={18} />
          <Skeleton w={180} h={38} r={9} />
        </div>
        <Skeleton w="100%" h={40} r={10} mb={26} />
        <CardListSkeleton count={4} />
      </main>
    </div>
  );
}
