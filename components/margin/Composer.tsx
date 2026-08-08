"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PenLine, Send } from "lucide-react";
import { C, EASE } from "@/lib/tokens";
import type { Block } from "@/lib/types";
import { computeKind, hasChanged } from "@/lib/suggestion";
import { Diff } from "@/components/ui/Diff";
import { Pill } from "@/components/ui/Pill";
import { Btn } from "@/components/ui/Btn";

export interface ComposerSubmit {
  proposed: string;
  reason: string;
  kind: "typo" | "edit";
}

/**
 * Rédaction d'une proposition ancrée sur un bloc. Le `kind` est calculé en
 * direct (correction vs réécriture) ; une réécriture exige un motif.
 */
export function Composer({
  block,
  busy,
  onCancel,
  onSubmit,
}: {
  block: Block;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (payload: ComposerSubmit) => void;
}) {
  const [text, setText] = useState(block.text);
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const changed = hasChanged(block.text, text);
  const kind = changed ? computeKind(block.text, text) : "typo";
  const reasonRequired = kind === "edit";
  const canSubmit = changed && (!reasonRequired || reason.trim().length > 0) && !busy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.38, ease: EASE as unknown as [number, number, number, number] }}
      style={{
        border: `1px solid ${C.pencil}`, borderRadius: 10, background: C.paper,
        padding: 14, marginTop: 10, boxShadow: "0 6px 22px -14px rgba(23,25,28,.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <PenLine size={13} color={C.pencil} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.pencil }}>Votre proposition</span>
        <span style={{ marginLeft: "auto" }}>
          <Pill tone={kind}>{kind === "typo" ? "correction" : "réécriture"}</Pill>
        </span>
      </div>

      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.max(3, Math.ceil(text.length / 62))}
        style={{
          width: "100%", boxSizing: "border-box", resize: "vertical", border: `1px solid ${C.rule}`,
          borderRadius: 7, padding: "10px 11px", fontFamily: "var(--serif)", fontSize: 14.5,
          lineHeight: 1.6, color: C.ink, background: C.field, outline: "none",
        }}
      />

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={reasonRequired ? "Pourquoi ce changement ? (obligatoire)" : "Pourquoi ce changement ? (visible par l'auteur)"}
        style={{
          width: "100%", boxSizing: "border-box", marginTop: 8, border: "none",
          borderBottom: `1px solid ${C.rule}`, padding: "7px 2px", fontSize: 13,
          fontFamily: "inherit", color: C.ink, background: "transparent", outline: "none",
        }}
      />

      {changed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 12, padding: 11, background: C.panel, borderRadius: 8 }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 7 }}>
            Aperçu
          </div>
          <Diff from={block.text} to={text} />
        </motion.div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
        <Btn onClick={onCancel}>Annuler</Btn>
        <Btn
          variant="solid"
          icon={Send}
          disabled={!canSubmit}
          onClick={() => onSubmit({ proposed: text, reason: reason.trim(), kind })}
        >
          {busy ? "Envoi…" : "Proposer"}
        </Btn>
      </div>
    </motion.div>
  );
}
