import { createClient } from "@/lib/supabase/server";

export interface BlockedUser {
  blocked_id: string;
  handle: string;
  display_name: string;
  created_at: string;
}

/** Contributeurs bloqués par `userId`, enrichis de leur profil. */
export async function getBlockedUsers(userId: string): Promise<BlockedUser[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("author_blocks")
    .select("blocked_id, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  const rows = (data as { blocked_id: string; created_at: string }[]) ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.blocked_id);
  const { data: profs } = await supabase.from("profiles").select("id, handle, display_name").in("id", ids);
  const byId = new Map(
    (profs as { id: string; handle: string; display_name: string }[] ?? []).map((p) => [p.id, p]),
  );

  return rows.map((r) => ({
    blocked_id: r.blocked_id,
    handle: byId.get(r.blocked_id)?.handle ?? "",
    display_name: byId.get(r.blocked_id)?.display_name ?? "Contributeur",
    created_at: r.created_at,
  }));
}
