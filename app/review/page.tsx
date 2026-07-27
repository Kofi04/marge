import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { getReviewQueue } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const { userId, profile } = await getSessionProfile();
  if (!userId || !profile) redirect("/login?next=/review");

  const items = await getReviewQueue(userId);

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <AppHeader profile={profile} active="review" />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 6px" }}>
          File de relecture
        </h1>
        <p style={{ fontSize: 14, color: C.inkSoft, margin: 0 }}>
          Les propositions en attente sur tous vos articles. {items.length > 0 && `${items.length} à relire.`}
        </p>
        <ReviewQueue items={items} userId={userId} />
      </main>
    </div>
  );
}
