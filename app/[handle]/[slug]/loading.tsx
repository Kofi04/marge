import { C } from "@/lib/tokens";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ArticleLoading() {
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <header style={{ borderBottom: `1px solid ${C.rule}`, background: C.headerBg }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <Skeleton w={90} h={22} r={6} />
          <Skeleton w={120} h={14} style={{ marginLeft: 6 }} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Skeleton w={26} h={26} r={13} />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 22px 90px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 350px", gap: 34, alignItems: "start" }} className="article-loading-grid">
        {/* Corps de l'article */}
        <div style={{ maxWidth: 660 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 26 }}>
            <Skeleton w={22} h={22} r={11} /><Skeleton w={140} h={13} />
          </div>
          <Skeleton w="90%" h={38} mb={16} />
          <Skeleton w="70%" h={22} mb={28} />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <Skeleton w="100%" h={15} mb={7} />
              <Skeleton w="97%" h={15} mb={7} />
              <Skeleton w={`${70 + (i % 3) * 8}%`} h={15} />
            </div>
          ))}
        </div>

        {/* Marge */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ border: `1px solid ${C.rule}`, borderRadius: 9, padding: 13 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
                <Skeleton w={22} h={22} r={11} /><Skeleton w={100} h={12} />
              </div>
              <Skeleton w="100%" h={13} mb={6} /><Skeleton w="80%" h={13} />
            </div>
          ))}
        </div>
      </div>

      <style>{`@media (max-width: 980px){ .article-loading-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
