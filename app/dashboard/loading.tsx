import { C } from "@/lib/tokens";
import { HeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <HeaderSkeleton />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "34px 22px 90px" }}>
        <Skeleton w={220} h={30} mb={24} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 34 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ border: `1px solid ${C.rule}`, borderRadius: 12, padding: "16px 18px" }}>
              <Skeleton w={16} h={16} r={4} mb={10} />
              <Skeleton w={70} h={24} mb={8} />
              <Skeleton w={100} h={12} />
            </div>
          ))}
        </div>
        <Skeleton w="100%" h={200} r={12} />
      </main>
    </div>
  );
}
