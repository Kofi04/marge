import { C } from "@/lib/tokens";
import { HeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function WriteLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <HeaderSkeleton />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "34px 22px 90px" }}>
        <Skeleton w="70%" h={40} mb={14} />
        <Skeleton w="50%" h={22} mb={24} />
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} w={32} h={32} r={7} />)}
        </div>
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 18 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} w={`${88 - i * 6}%`} h={16} mb={12} />
          ))}
        </div>
      </main>
    </div>
  );
}
