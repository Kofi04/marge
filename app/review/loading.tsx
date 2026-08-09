import { C } from "@/lib/tokens";
import { HeaderSkeleton, Skeleton, CardListSkeleton } from "@/components/ui/Skeleton";

export default function ReviewLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <HeaderSkeleton />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        <Skeleton w={200} h={30} mb={20} />
        <CardListSkeleton count={3} />
      </main>
    </div>
  );
}
