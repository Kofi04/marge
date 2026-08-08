"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { C } from "@/lib/tokens";

/** Champ de recherche : soumet vers /search?q=. */
export function SearchBox({ initial = "", autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={submit} style={{ position: "relative", width: "100%" }}>
      <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkFaint, pointerEvents: "none" }} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un article, un sujet, un tag…"
        autoFocus={autoFocus}
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px",
          border: `1px solid ${C.rule}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit",
          background: C.field, color: C.ink, outline: "none",
        }}
      />
    </form>
  );
}
