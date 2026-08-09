import { C } from "@/lib/tokens";
import { HeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <HeaderSkeleton />
      <main style={{ maxWidth: 620, margin: "0 auto", padding: "34px 22px 90px" }}>
        <Skeleton w={160} h={30} mb={28} />
        <Skeleton w={80} h={12} mb={16} />
        <div style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton w="100%" h={42} r={9} />
          <Skeleton w="100%" h={42} r={9} />
          <Skeleton w="100%" h={70} r={9} />
        </div>
      </main>
    </div>
  );
}
