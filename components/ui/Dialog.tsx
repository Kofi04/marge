"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { C, EASE } from "@/lib/tokens";

type DialogKind = "confirm" | "prompt";

interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

interface DialogRequest extends DialogOptions {
  kind: DialogKind;
}

type Resolver = (value: boolean | string | null) => void;

interface DialogApi {
  confirm: (opts: DialogOptions) => Promise<boolean>;
  prompt: (opts: DialogOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

/** Accès aux modals in-app (remplace window.confirm / window.prompt). */
export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog doit être utilisé dans <DialogProvider>.");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState("");
  const resolverRef = useRef<Resolver | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback((r: DialogRequest) => {
    setReq(r);
    setValue(r.defaultValue ?? "");
    return new Promise<boolean | string | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean | string | null) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setReq(null);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (opts) => open({ ...opts, kind: "confirm" }) as Promise<boolean>,
      prompt: (opts) => open({ ...opts, kind: "prompt" }) as Promise<string | null>,
    }),
    [open],
  );

  const onConfirm = useCallback(() => settle(req?.kind === "prompt" ? value : true), [req, value, settle]);
  const onCancel = useCallback(() => settle(req?.kind === "prompt" ? null : false), [req, settle]);

  // Focus l'input à l'ouverture d'un prompt.
  useEffect(() => {
    if (req?.kind === "prompt") setTimeout(() => inputRef.current?.focus(), 20);
  }, [req]);

  // Esc annule, Entrée valide (hors saisie multi-ligne).
  useEffect(() => {
    if (!req) return;
    const kind = req.kind;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      else if (e.key === "Enter" && kind === "confirm") { e.preventDefault(); onConfirm(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req, onConfirm, onCancel]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <AnimatePresence>
        {req && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onCancel}
            style={{
              position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center",
              background: "rgba(10,11,13,.5)", backdropFilter: "blur(2px)", padding: 20,
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE as unknown as [number, number, number, number] }}
              style={{
                width: "100%", maxWidth: 420, background: C.paper, border: `1px solid ${C.rule}`,
                borderRadius: 14, padding: 22, boxShadow: "0 24px 60px -24px rgba(0,0,0,.5)",
              }}
            >
              <h2 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, letterSpacing: "-.01em", color: C.ink }}>
                {req.title}
              </h2>
              {req.message && (
                <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.55, color: C.inkSoft }}>{req.message}</p>
              )}

              {req.kind === "prompt" && (
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onConfirm(); } }}
                  placeholder={req.placeholder}
                  style={{
                    width: "100%", boxSizing: "border-box", marginTop: 14, padding: "10px 12px",
                    border: `1px solid ${C.rule}`, borderRadius: 9, fontSize: 14, fontFamily: "inherit",
                    background: C.field, color: C.ink, outline: "none",
                  }}
                />
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                <button
                  type="button"
                  onClick={onCancel}
                  style={{ padding: "9px 15px", borderRadius: 9, border: `1px solid ${C.rule}`, background: C.paper, color: C.ink, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {req.cancelLabel ?? "Annuler"}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  style={{
                    padding: "9px 15px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit",
                    background: req.danger ? C.delInk : C.ink, color: C.paper,
                  }}
                >
                  {req.confirmLabel ?? "Confirmer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}
