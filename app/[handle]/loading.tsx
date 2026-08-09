import { C } from "@/lib/tokens";
import { Skeleton, CardListSkeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <header style={{ borderBottom: `1px solid ${C.rule}`, background: C.headerBg }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "11px 22px" }}>
          <Skeleton w={90} h={22} r={6} />
        </div>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 22px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <Skeleton w={56} h={56} r={28} />
          <div style={{ flex: 1 }}>
            <Skeleton w={180} h={26} mb={8} />
            <Skeleton w={100} h={13} />
          </div>
          <Skeleton w={90} h={34} r={9} />
        </div>
        <div style={{ display: "flex", gap: 20, marginBottom: 34 }}>
          <Skeleton w={80} h={13} /><Skeleton w={110} h={13} /><Skeleton w={80} h={13} />
        </div>
        <CardListSkeleton count={3} />
      </main>
    </div>
  );
}
