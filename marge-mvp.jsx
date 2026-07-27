import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PenLine, Check, X, Clock, GitBranch, Users, MessageSquare,
  ChevronRight, Sparkles, AlertTriangle, Eye, Send, CornerDownLeft, History,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tokens                                                             */
/* ------------------------------------------------------------------ */

const C = {
  paper: "#FCFCFA",
  panel: "#F4F4F0",
  ink: "#17191C",
  inkSoft: "#5E6167",
  inkFaint: "#9B9EA3",
  rule: "#E4E4DD",
  pencil: "#3B4CC0",      // bleu de correction — suggestions ouvertes
  pencilSoft: "#EDEFFB",
  accepted: "#1F7A55",
  acceptedSoft: "#E6F2EC",
  stale: "#A8630F",
  staleSoft: "#FBF0DF",
  del: "#FBE3E3",
  delInk: "#93312F",
  add: "#E1F1E7",
  addInk: "#1C6B4A",
};

const EASE = "cubic-bezier(.22,1,.36,1)";

/* ------------------------------------------------------------------ */
/*  Contenu initial                                                    */
/* ------------------------------------------------------------------ */

const SEED_BLOCKS = [
  { id: "b1", type: "h1", text: "Le bloc, et pas la ligne" },
  { id: "b2", type: "lede", text: "Pourquoi un système de contribution pour du texte ne doit surtout pas copier Git." },
  { id: "b3", type: "p", text: "Git compare des lignes. C'est le bon choix quand on écrit du code : une ligne y est une unité de sens, et deux personnes qui touchent la même ligne ont probablement un vrai conflit à résoudre." },
  { id: "b4", type: "p", text: "Le texte ne fonctionne pas comme ça. Un lecteur qui corrige un article ne pense jamais en lignes. Il pense « cette phrase est bancale », « ce paragraphe manque une source ». L'unité mentale est le bloc." },
  { id: "b5", type: "quote", text: "Un diff ligne à ligne sur de la prose produit un mur rouge et vert que personne ne relit." },
  { id: "b6", type: "p", text: "En ancrant chaque proposition sur un identifiant de bloc stable, trois problèmes disparaissent d'un coup : le diff redevient lisible, les conflits de fusion n'existent plus, et détecter qu'une proposition est périmée devient trivial — le bloc a changé, donc la proposition ne s'applique plus." },
];

const ME = { name: "Amina Kpodo", initials: "AK" };
const AUTHOR = { name: "Yao Mensah", initials: "YM" };

const SEED_SUGGESTIONS = [
  {
    id: "s1", blockId: "b3", baseRev: 1, kind: "edit",
    author: { name: "Selim Rahmani", initials: "SR" },
    original: SEED_BLOCKS[2].text,
    proposed: "Git compare des lignes. C'est le bon choix quand on écrit du code : une ligne y est une unité de sens, et deux personnes qui modifient la même ligne ont presque toujours un vrai conflit à résoudre.",
    reason: "« touchent » est un peu vague pour un texte technique.",
    status: "open", createdAt: "il y a 2 h",
  },
  {
    id: "s2", blockId: "b6", baseRev: 1, kind: "typo",
    author: { name: "Fatou Diallo", initials: "FD" },
    original: SEED_BLOCKS[5].text,
    proposed: "En ancrant chaque proposition sur un identifiant de bloc stable, trois problèmes disparaissent d'un coup : le diff redevient lisible, les conflits de fusion n'existent plus, et détecter qu'une proposition est périmée devient trivial — le bloc a changé, donc la proposition ne s'applique plus.",
    reason: "Rien à signaler, le bloc est déjà correct.",
    status: "open", createdAt: "il y a 20 min",
  },
];

/* ------------------------------------------------------------------ */
/*  Diff mot à mot (LCS)                                               */
/* ------------------------------------------------------------------ */

function tokenize(s) {
  return s.split(/(\s+)/).filter((t) => t !== "");
}

function diffWords(a, b) {
  const A = tokenize(a), B = tokenize(b);
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const out = [];
  let i = 0, j = 0;
  const push = (type, value) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.value += value;
    else out.push({ type, value });
  };
  while (i < n && j < m) {
    if (A[i] === B[j]) { push("same", A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("del", A[i]); i++; }
    else { push("add", B[j]); j++; }
  }
  while (i < n) { push("del", A[i]); i++; }
  while (j < m) { push("add", B[j]); j++; }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Petits composants                                                  */
/* ------------------------------------------------------------------ */

function Avatar({ person, size = 26, tone = "ink" }) {
  const bg = tone === "pencil" ? C.pencilSoft : "#EAEAE4";
  const fg = tone === "pencil" ? C.pencil : C.inkSoft;
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size, background: bg, color: fg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 600, letterSpacing: ".02em", flexShrink: 0,
      }}
    >
      {person.initials}
    </span>
  );
}

function Diff({ from, to }) {
  const parts = useMemo(() => diffWords(from, to), [from, to]);
  return (
    <div style={{ fontFamily: "var(--serif)", fontSize: 14.5, lineHeight: 1.65, color: C.ink }}>
      {parts.map((p, k) =>
        p.type === "same" ? (
          <span key={k} style={{ color: C.inkSoft }}>{p.value}</span>
        ) : (
          <span
            key={k}
            style={{
              background: p.type === "del" ? C.del : C.add,
              color: p.type === "del" ? C.delInk : C.addInk,
              textDecoration: p.type === "del" ? "line-through" : "none",
              textDecorationThickness: "1px",
              borderRadius: 3, padding: "1px 2px", margin: "0 -1px",
            }}
          >
            {p.value}
          </span>
        )
      )}
    </div>
  );
}

function Pill({ children, tone }) {
  const map = {
    typo: { bg: C.panel, fg: C.inkSoft },
    edit: { bg: C.pencilSoft, fg: C.pencil },
    stale: { bg: C.staleSoft, fg: C.stale },
    accepted: { bg: C.acceptedSoft, fg: C.accepted },
  };
  const s = map[tone] || map.typo;
  return (
    <span style={{
      background: s.bg, color: s.fg, fontSize: 10.5, fontWeight: 600,
      letterSpacing: ".04em", textTransform: "uppercase",
      padding: "3px 7px", borderRadius: 4, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Btn({ children, onClick, variant = "ghost", icon: Icon, disabled }) {
  const [hov, setHov] = useState(false);
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid transparent",
    borderRadius: 7, padding: "7px 11px", fontSize: 13, fontWeight: 500, cursor: "pointer",
    fontFamily: "inherit", transition: `all .2s ${EASE}`, opacity: disabled ? 0.4 : 1,
  };
  const styles = {
    solid: { background: hov ? "#0E1013" : C.ink, color: C.paper, transform: hov ? "translateY(-1px)" : "none" },
    accept: { background: hov ? "#1A6949" : C.accepted, color: "#fff", transform: hov ? "translateY(-1px)" : "none" },
    outline: { background: hov ? C.panel : "transparent", color: C.ink, borderColor: C.rule },
    ghost: { background: hov ? C.panel : "transparent", color: C.inkSoft },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, ...styles[variant] }}
    >
      {Icon && <Icon size={14} strokeWidth={2} />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Composer                                                           */
/* ------------------------------------------------------------------ */

function Composer({ block, onCancel, onSubmit }) {
  const [text, setText] = useState(block.text);
  const [reason, setReason] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const changed = text.trim() !== block.text.trim();
  const kind = changed && Math.abs(text.length - block.text.length) < 25 ? "typo" : "edit";

  return (
    <div className="rise" style={{
      border: `1px solid ${C.pencil}`, borderRadius: 10, background: C.paper,
      padding: 14, marginTop: 10, boxShadow: "0 6px 22px -14px rgba(23,25,28,.35)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <PenLine size={13} color={C.pencil} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.pencil }}>Votre proposition</span>
        <span style={{ marginLeft: "auto" }}><Pill tone={kind}>{kind === "typo" ? "correction" : "réécriture"}</Pill></span>
      </div>

      <textarea
        ref={ref} value={text} onChange={(e) => setText(e.target.value)}
        rows={Math.max(3, Math.ceil(text.length / 62))}
        style={{
          width: "100%", boxSizing: "border-box", resize: "vertical", border: `1px solid ${C.rule}`,
          borderRadius: 7, padding: "10px 11px", fontFamily: "var(--serif)", fontSize: 14.5,
          lineHeight: 1.6, color: C.ink, background: "#fff", outline: "none",
        }}
      />

      <input
        value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Pourquoi ce changement ? (visible par l'auteur)"
        style={{
          width: "100%", boxSizing: "border-box", marginTop: 8, border: "none",
          borderBottom: `1px solid ${C.rule}`, padding: "7px 2px", fontSize: 13,
          fontFamily: "inherit", color: C.ink, background: "transparent", outline: "none",
        }}
      />

      {changed && (
        <div className="rise" style={{ marginTop: 12, padding: 11, background: C.panel, borderRadius: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 7 }}>
            Aperçu
          </div>
          <Diff from={block.text} to={text} />
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
        <Btn onClick={onCancel}>Annuler</Btn>
        <Btn variant="solid" icon={Send} disabled={!changed}
          onClick={() => onSubmit({ proposed: text, reason: reason.trim(), kind })}>
          Proposer
        </Btn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Carte de suggestion (marge)                                        */
/* ------------------------------------------------------------------ */

function SuggestionCard({ s, isAuthor, active, onFocus, onAccept, onReject }) {
  const [hov, setHov] = useState(false);
  const stale = s.status === "stale";
  const border = active ? C.pencil : hov ? "#C9CBD2" : C.rule;

  return (
    <div
      onMouseEnter={() => { setHov(true); onFocus(s.blockId); }}
      onMouseLeave={() => setHov(false)}
      className="rise"
      style={{
        border: `1px solid ${border}`, borderLeft: `2px solid ${stale ? C.stale : active ? C.pencil : border}`,
        borderRadius: 9, background: C.paper, padding: 13, marginBottom: 10,
        transition: `border-color .25s ${EASE}, transform .25s ${EASE}, box-shadow .25s ${EASE}`,
        transform: active ? "translateX(-3px)" : "none",
        boxShadow: active ? "0 8px 24px -18px rgba(23,25,28,.5)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <Avatar person={s.author} size={22} tone={active ? "pencil" : "ink"} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{s.author.name}</span>
        <span style={{ fontSize: 11.5, color: C.inkFaint }}>{s.createdAt}</span>
        <span style={{ marginLeft: "auto" }}>
          <Pill tone={stale ? "stale" : s.kind}>{stale ? "périmée" : s.kind === "typo" ? "correction" : "réécriture"}</Pill>
        </span>
      </div>

      <Diff from={s.original} to={s.proposed} />

      {s.reason && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "flex-start" }}>
          <MessageSquare size={12} color={C.inkFaint} style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: C.inkSoft }}>{s.reason}</p>
        </div>
      )}

      {stale ? (
        <div style={{
          display: "flex", gap: 7, alignItems: "flex-start", marginTop: 11,
          padding: "8px 9px", background: C.staleSoft, borderRadius: 6,
        }}>
          <AlertTriangle size={13} color={C.stale} style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 12, lineHeight: 1.45, color: C.stale }}>
            Le paragraphe a changé depuis. Cette proposition ne s'applique plus.
          </span>
        </div>
      ) : isAuthor ? (
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <Btn variant="accept" icon={Check} onClick={() => onAccept(s)}>Accepter</Btn>
          <Btn variant="outline" icon={X} onClick={() => onReject(s)}>Refuser</Btn>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 11, color: C.inkFaint, fontSize: 12 }}>
          <Clock size={12} /> En attente de relecture
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [revisions, setRevisions] = useState([
    { n: 1, blocks: SEED_BLOCKS, note: "Publication initiale", by: AUTHOR.name },
  ]);
  const [suggestions, setSuggestions] = useState(SEED_SUGGESTIONS);
  const [isAuthor, setIsAuthor] = useState(false);
  const [editing, setEditing] = useState(null);
  const [focused, setFocused] = useState(null);
  const [flash, setFlash] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);

  const current = revisions[revisions.length - 1];
  const blocks = current.blocks;

  useEffect(() => {
    const id = "gf-marge";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Une suggestion devient périmée si son bloc d'origine a changé depuis.
  const resolved = useMemo(() => suggestions.map((s) => {
    if (s.status !== "open") return s;
    const b = blocks.find((x) => x.id === s.blockId);
    return b && b.text !== s.original ? { ...s, status: "stale" } : s;
  }), [suggestions, blocks]);

  const queue = resolved.filter((s) => s.status === "open" || s.status === "stale");
  const openCount = resolved.filter((s) => s.status === "open").length;

  const contributors = useMemo(() => {
    const map = new Map();
    resolved.filter((s) => s.status === "accepted").forEach((s) => {
      const e = map.get(s.author.name) || { person: s.author, count: 0 };
      e.count++; map.set(s.author.name, e);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [resolved]);

  const submit = (block, { proposed, reason, kind }) => {
    setSuggestions((prev) => [{
      id: "s" + Date.now(), blockId: block.id, baseRev: current.n, kind,
      author: ME, original: block.text, proposed, reason, status: "open", createdAt: "à l'instant",
    }, ...prev]);
    setEditing(null);
    setToast({ icon: Sparkles, text: "Proposition envoyée à l'auteur" });
  };

  const accept = (s) => {
    setRevisions((prev) => [...prev, {
      n: prev.length + 1,
      blocks: blocks.map((b) => (b.id === s.blockId ? { ...b, text: s.proposed } : b)),
      note: `Proposition de ${s.author.name} intégrée`,
      by: s.author.name,
    }]);
    setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "accepted" } : x)));
    setFlash(s.blockId);
    setTimeout(() => setFlash(null), 1400);
    setToast({ icon: Check, text: `Révision ${revisions.length + 1} publiée · ${s.author.name} crédité` });
  };

  const reject = (s) => {
    setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "rejected" } : x)));
    setToast({ icon: X, text: "Proposition refusée" });
  };

  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: "var(--sans)", color: C.ink }}>
      <style>{`
        :root { --sans: 'Manrope', ui-sans-serif, system-ui, sans-serif;
                --serif: 'Newsreader', Georgia, 'Times New Roman', serif; }
        * { -webkit-font-smoothing: antialiased; }
        button:focus-visible, textarea:focus-visible, input:focus-visible {
          outline: 2px solid ${C.pencil}; outline-offset: 2px; }
        @keyframes rise { from { opacity: 0; transform: translateY(8px) scale(.985); }
                          to { opacity: 1; transform: none; } }
        @keyframes flash { 0% { background: transparent; }
                           25% { background: ${C.acceptedSoft}; }
                           100% { background: transparent; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .rise { animation: rise .38s ${EASE} both; }
        .flash { animation: flash 1.4s ${EASE}; border-radius: 5px; }
        .toast { animation: slideUp .4s ${EASE} both; }
        .marker { opacity: 0; transform: translateX(-4px); transition: all .28s ${EASE}; }
        .blk:hover .marker, .blk:focus-within .marker { opacity: 1; transform: none; }
        .leader { transition: opacity .3s ${EASE}; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
        @media (max-width: 900px) { .shell { grid-template-columns: 1fr !important; } .rail { border-left: none !important; } }
      `}</style>

      {/* Barre supérieure */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20, background: "rgba(252,252,250,.88)",
        backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.rule}`,
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, background: C.ink, color: C.paper,
              display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700,
            }}>M</div>
            <span style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: "-.01em" }}>Marge</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 6, color: C.inkFaint, fontSize: 12.5 }}>
            <GitBranch size={13} /> révision {current.n}
            <button onClick={() => setShowHistory((v) => !v)}
              style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: "2px 4px", display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "inherit", fontSize: 12.5 }}>
              <History size={13} /> historique
            </button>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {isAuthor && openCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.pencil, fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: 6, background: C.pencil }} />
                {openCount} à relire
              </span>
            )}
            <div style={{ display: "flex", background: C.panel, borderRadius: 8, padding: 3 }}>
              {[["Lecteur", false], ["Auteur", true]].map(([label, val]) => (
                <button key={label} onClick={() => { setIsAuthor(val); setEditing(null); }}
                  style={{
                    border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
                    padding: "5px 11px", borderRadius: 6, transition: `all .25s ${EASE}`,
                    background: isAuthor === val ? C.paper : "transparent",
                    color: isAuthor === val ? C.ink : C.inkFaint,
                    boxShadow: isAuthor === val ? "0 1px 3px rgba(23,25,28,.09)" : "none",
                  }}>{label}</button>
              ))}
            </div>
            <Avatar person={isAuthor ? AUTHOR : ME} />
          </div>
        </div>

        {showHistory && (
          <div className="rise" style={{ borderTop: `1px solid ${C.rule}`, background: C.panel }}>
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 22px", display: "flex", gap: 22, flexWrap: "wrap" }}>
              {[...revisions].reverse().map((r) => (
                <div key={r.n} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: r.n === current.n ? C.paper : C.inkSoft,
                    background: r.n === current.n ? C.ink : "#E4E4DD", borderRadius: 5, padding: "2px 6px",
                  }}>v{r.n}</span>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.ink }}>{r.note}</div>
                    <div style={{ fontSize: 11.5, color: C.inkFaint }}>{r.by}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Corps */}
      <div className="shell" style={{
        maxWidth: 1180, margin: "0 auto", padding: "40px 22px 90px",
        display: "grid", gridTemplateColumns: "minmax(0,1fr) 350px", gap: 34, alignItems: "start",
      }}>
        {/* Article */}
        <article style={{ maxWidth: 660 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 26, color: C.inkFaint, fontSize: 12.5 }}>
            <Avatar person={AUTHOR} size={22} />
            <span style={{ color: C.ink, fontWeight: 600 }}>{AUTHOR.name}</span>
            <span>·</span><span>12 min de lecture</span>
          </div>

          {blocks.map((b) => {
            const open = queue.filter((s) => s.blockId === b.id);
            const isEditing = editing === b.id;
            const dimmed = focused && focused !== b.id;

            const typo = {
              h1: { fontFamily: "var(--serif)", fontSize: 40, lineHeight: 1.12, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 14px" },
              lede: { fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.55, fontStyle: "italic", color: C.inkSoft, margin: "0 0 26px" },
              p: { fontFamily: "var(--serif)", fontSize: 17.5, lineHeight: 1.72, margin: "0 0 20px" },
              quote: { fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.55, margin: "26px 0", paddingLeft: 18, borderLeft: `2px solid ${C.ink}`, fontWeight: 500 },
            }[b.type];

            return (
              <div key={b.id} className="blk"
                onMouseEnter={() => !editing && setFocused(b.id)}
                onMouseLeave={() => !editing && setFocused(null)}
                style={{ position: "relative", transition: `opacity .3s ${EASE}`, opacity: dimmed ? 0.42 : 1 }}>

                {/* Marqueur de marge gauche */}
                {!isAuthor && !isEditing && (
                  <button className="marker" onClick={() => { setEditing(b.id); setFocused(b.id); }}
                    aria-label="Suggérer une modification"
                    style={{
                      position: "absolute", left: -34, top: 4, width: 24, height: 24, borderRadius: 6,
                      border: `1px solid ${C.rule}`, background: C.paper, color: C.pencil,
                      cursor: "pointer", display: "grid", placeItems: "center",
                    }}>
                    <PenLine size={12} />
                  </button>
                )}

                {/* Compteur de propositions à droite */}
                {open.length > 0 && (
                  <span style={{
                    position: "absolute", right: -26, top: 6, fontSize: 11, fontWeight: 700,
                    color: open.some((s) => s.status === "stale") ? C.stale : C.pencil,
                    display: "inline-flex", alignItems: "center", gap: 2,
                  }}>
                    {open.length}<ChevronRight size={11} />
                  </span>
                )}

                <div className={flash === b.id ? "flash" : ""}>
                  {b.type === "h1" ? <h1 style={typo}>{b.text}</h1>
                    : b.type === "quote" ? <blockquote style={typo}>{b.text}</blockquote>
                    : <p style={typo}>{b.text}</p>}
                </div>

                {isEditing && (
                  <Composer block={b} onCancel={() => setEditing(null)}
                    onSubmit={(payload) => submit(b, payload)} />
                )}
              </div>
            );
          })}

          {/* Crédits */}
          <div style={{ marginTop: 44, paddingTop: 22, borderTop: `1px solid ${C.rule}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, color: C.inkFaint, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
              <Users size={13} /> Ont amélioré cet article
            </div>
            {contributors.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13.5, color: C.inkFaint }}>
                Personne encore. La première proposition acceptée apparaîtra ici.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {contributors.map((c) => (
                  <div key={c.person.name} className="rise" style={{
                    display: "flex", alignItems: "center", gap: 7, background: C.panel,
                    borderRadius: 20, padding: "5px 12px 5px 5px",
                  }}>
                    <Avatar person={c.person} size={22} tone="pencil" />
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.person.name}</span>
                    <span style={{ fontSize: 11.5, color: C.inkFaint }}>{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Marge */}
        <aside className="rail" style={{
          position: "sticky", top: 78, borderLeft: `1px solid ${C.rule}`, paddingLeft: 22,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.inkFaint }}>
              {isAuthor ? "File de relecture" : "Propositions en cours"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.inkFaint }}>{queue.length}</span>
          </div>

          {queue.length === 0 ? (
            <div style={{ border: `1px dashed ${C.rule}`, borderRadius: 9, padding: 20, textAlign: "center" }}>
              <Eye size={17} color={C.inkFaint} />
              <p style={{ margin: "9px 0 0", fontSize: 13, lineHeight: 1.5, color: C.inkSoft }}>
                Rien à relire.<br />
                {!isAuthor && <span style={{ color: C.inkFaint }}>Survolez un paragraphe pour en proposer une.</span>}
              </p>
            </div>
          ) : (
            queue.map((s) => (
              <SuggestionCard key={s.id} s={s} isAuthor={isAuthor}
                active={focused === s.blockId}
                onFocus={setFocused} onAccept={accept} onReject={reject} />
            ))
          )}

          {!isAuthor && (
            <div style={{ marginTop: 16, display: "flex", gap: 7, alignItems: "flex-start", color: C.inkFaint }}>
              <CornerDownLeft size={13} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                Passez en mode Auteur pour accepter ou refuser les propositions.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{
          position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)",
          background: C.ink, color: C.paper, borderRadius: 9, padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 500,
          boxShadow: "0 12px 32px -14px rgba(23,25,28,.6)", zIndex: 50,
        }}>
          <toast.icon size={15} />{toast.text}
        </div>
      )}
    </div>
  );
}
