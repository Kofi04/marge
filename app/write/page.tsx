import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { Editor } from "@/components/editor/Editor";
import { C } from "@/lib/tokens";
import type { Article, Block, Revision } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { userId, profile } = await getSessionProfile();
  if (!userId || !profile) redirect("/login?next=/write");

  const { edit } = await searchParams;

  let initial: { id: string; title: string; lede: string; blocks: Block[] } | undefined;
  if (edit) {
    const supabase = await createClient();
    const { data: articleRow } = await supabase.from("articles").select("*").eq("id", edit).single();
    const article = articleRow as Article | null;
    if (article && article.author_id === userId && article.current_revision_id) {
      const { data: rev } = await supabase.from("revisions").select("*").eq("id", article.current_revision_id).single();
      const revision = rev as Revision | null;
      initial = {
        id: article.id,
        title: article.title,
        lede: article.lede ?? "",
        blocks: revision?.blocks ?? [],
      };
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <AppHeader profile={profile} active="write" />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "34px 22px 90px" }}>
        <Editor initial={initial} />
      </main>
    </div>
  );
}
