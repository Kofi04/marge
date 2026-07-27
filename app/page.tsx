"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PenLine, Check, ArrowRight, Users, GitBranch, Zap, ShieldCheck,
  MessageSquare, AlertTriangle,
} from "lucide-react";
import { C, EASE } from "@/lib/tokens";
import { Diff } from "@/components/ui/Diff";
import { GithubMark } from "@/components/ui/GithubMark";
import { createClient } from "@/lib/supabase/client";

/* ---------------------------------------------------------------- */
/*  Révélation au scroll — framer-motion remplace l'IntersectionObserver */
/* ---------------------------------------------------------------- */

function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      style={style}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.7,
        ease: EASE as unknown as [number, number, number, number],
        delay: delay / 1000,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- */
/*  Démo animée du héros                                             */
/* ---------------------------------------------------------------- */

const BEFORE =
  "Git compare des lignes, et deux personnes qui touchent la même ligne ont probablement un vrai conflit.";
const AFTER =
  "Git compare des lignes, et deux personnes qui modifient la même ligne ont presque toujours un vrai conflit.";

function HeroDemo() {
  const [step, setStep] = useState(0); // 0 repos · 1 marqueur · 2 carte · 3 acceptée
  useEffect(() => {
    const timings = [1600, 1100, 3400, 2600];
    const t = setTimeout(() => setStep((s) => (s + 1) % 4), timings[step]);
    return () => clearTimeout(t);
  }, [step]);

  const accepted = step === 3;

  return (
    <div
      style={{
        position: "relative", background: C.paper, border: `1px solid ${C.rule}`,
        borderRadius: 14, padding: "26px 26px 26px 44px",
        boxShadow: "0 30px 60px -40px rgba(23,25,28,.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 18, fontSize: 11.5, color: C.inkFaint }}>
        <GitBranch size={12} />
        <span style={{ transition: "color .5s", color: accepted ? C.accepted : C.inkFaint, fontWeight: accepted ? 600 : 400 }}>
          révision {accepted ? 2 : 1}
        </span>
      </div>

      <button
        aria-hidden="true" tabIndex={-1}
        style={{
          position: "absolute", left: 14, top: 62, width: 24, height: 24, borderRadius: 6,
          border: `1px solid ${step >= 1 && !accepted ? C.pencil : C.rule}`, background: C.paper,
          color: C.pencil, display: "grid", placeItems: "center", cursor: "default",
          opacity: step >= 1 && !accepted ? 1 : 0,
          transform: step >= 1 && !accepted ? "none" : "translateX(-5px)",
          transition: "all .45s",
        }}
      >
        <PenLine size={12} />
      </button>

      <p
        style={{
          fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.7, margin: 0, color: C.ink,
          background: accepted ? C.acceptedSoft : "transparent",
          borderRadius: 5, padding: "2px 4px", marginLeft: -4, transition: "background 1.2s",
        }}
      >
        {accepted ? AFTER : BEFORE}
      </p>

      <div
        style={{
          marginTop: 18, borderLeft: `2px solid ${accepted ? C.accepted : C.pencil}`,
          borderTop: `1px solid ${C.rule}`, borderRight: `1px solid ${C.rule}`,
          borderBottom: `1px solid ${C.rule}`, borderRadius: 9, padding: 13,
          opacity: step >= 2 ? 1 : 0,
          transform: step >= 2 ? "none" : "translateY(10px) scale(.98)",
          transition: "all .5s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <span style={{ width: 21, height: 21, borderRadius: 21, background: C.pencilSoft, color: C.pencil, display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700 }}>
            SR
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Selim Rahmani</span>
          <span style={{ fontSize: 11, color: C.inkFaint }}>il y a 2 h</span>
          {accepted && (
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: C.accepted, background: C.acceptedSoft, padding: "3px 7px", borderRadius: 4 }}>
              <Check size={10} /> intégrée
            </span>
          )}
        </div>
        <Diff from={BEFORE} to={AFTER} size={13.5} />
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "flex-start" }}>
          <MessageSquare size={11} color={C.inkFaint} style={{ marginTop: 3, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
            « touchent » est vague pour un texte technique.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Landing                                                          */
/* ---------------------------------------------------------------- */

const steps = [
  { t: "Le lecteur propose", d: "Il survole un paragraphe, réécrit ce qui cloche, explique pourquoi. Le compte se crée à l'envoi, pas avant.", icon: PenLine },
  { t: "L'auteur tranche", d: "Une file de relecture, un diff lisible, deux boutons. Les coquilles s'acceptent en un clic ; les réécritures ouvrent une discussion.", icon: Check },
  { t: "L'article gagne une révision", d: "Le texte est mis à jour, l'historique conserve tout, et le contributeur apparaît dans les crédits.", icon: GitBranch },
];

export default function Landing() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setAuthed(!!data.user));
  }, []);
  const homeHref = authed ? "/home" : "/login";

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: "var(--sans)", minHeight: "100vh" }}>
      <style>{`
        a { color: inherit; text-decoration: none; }
        .cta { transition: transform .25s cubic-bezier(.22,1,.36,1), background .25s; }
        .cta:hover { transform: translateY(-2px); }
        .card { transition: border-color .3s, transform .3s; }
        .card:hover { border-color: #C9CBD2; transform: translateY(-3px); }
        .wrap { max-width: 1080px; margin: 0 auto; padding: 0 22px; }
        @media (max-width: 880px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .three { grid-template-columns: 1fr !important; }
          .h1 { font-size: 44px !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(252,252,250,.88)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.rule}` }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 12, height: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800 }}>M</div>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-.01em" }}>Marge</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18, fontSize: 13.5, color: C.inkSoft }}>
            <a href="#comment">Comment ça marche</a>
            <a href="#credits">Crédits</a>
            <Link href={homeHref} className="cta" style={{ background: C.ink, color: C.paper, padding: "8px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>{authed ? "Mon espace" : "Commencer"}</Link>
          </div>
        </div>
      </nav>

      {/* Héros */}
      <header className="wrap" style={{ paddingTop: 76, paddingBottom: 88 }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 54, alignItems: "center" }}>
          <Reveal>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.pencilSoft, color: C.pencil, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, marginBottom: 22 }}>
              <Zap size={12} /> Vos lecteurs corrigent mieux que votre relecture
            </div>
            <h1 className="h1" style={{ fontFamily: "var(--serif)", fontSize: 60, lineHeight: 1.04, fontWeight: 500, letterSpacing: "-.025em", margin: "0 0 20px" }}>
              Le meilleur relecteur<br />est déjà en train<br />de vous lire.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: C.inkSoft, margin: "0 0 30px", maxWidth: 440 }}>
              Marge est une plateforme de blog où vos lecteurs proposent des modifications
              directement dans la marge. Vous acceptez, l&apos;article gagne une révision,
              le contributeur gagne un crédit.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Link href={authed ? "/write" : "/login"} className="cta" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.ink, color: C.paper, padding: "13px 20px", borderRadius: 9, fontWeight: 600, fontSize: 14.5 }}>
                {authed ? "Écrire un article" : "Publier mon premier article"} <ArrowRight size={15} />
              </Link>
              <Link href="/@yao/le-bloc-et-pas-la-ligne" className="cta" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${C.rule}`, padding: "13px 18px", borderRadius: 9, fontWeight: 500, fontSize: 14.5, color: C.ink }}>
                Voir un article vivant
              </Link>
            </div>
          </Reveal>
          <Reveal delay={140}><HeroDemo /></Reveal>
        </div>
      </header>

      {/* La thèse */}
      <section style={{ background: C.panel, borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}`, padding: "76px 0" }}>
        <div className="wrap">
          <Reveal>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 12px", maxWidth: 620, lineHeight: 1.2 }}>
              Un diff conçu pour la prose, pas pour le code
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: C.inkSoft, margin: "0 0 34px", maxWidth: 560 }}>
              Les outils de versioning comparent des lignes. Personne ne relit un texte
              en lignes. Marge ancre chaque proposition sur un paragraphe et compare mot à mot.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="three" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 820 }}>
              <div style={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 11, padding: 18 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>
                  Diff ligne à ligne
                </div>
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, lineHeight: 1.75 }}>
                  <div style={{ background: C.del, color: C.delInk, padding: "2px 6px", borderRadius: 3 }}>
                    − Git compare des lignes, et deux personnes qui touchent…
                  </div>
                  <div style={{ background: C.add, color: C.addInk, padding: "2px 6px", borderRadius: 3, marginTop: 3 }}>
                    + Git compare des lignes, et deux personnes qui modifient…
                  </div>
                </div>
                <p style={{ fontSize: 12.5, color: C.inkFaint, margin: "13px 0 0", lineHeight: 1.5 }}>
                  Deux blocs entiers à relire pour un mot changé.
                </p>
              </div>
              <div style={{ background: C.paper, border: `1px solid ${C.pencil}`, borderRadius: 11, padding: 18 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.pencil, marginBottom: 12 }}>
                  Diff mot à mot
                </div>
                <Diff from={BEFORE} to={AFTER} size={13.5} />
                <p style={{ fontSize: 12.5, color: C.inkFaint, margin: "13px 0 0", lineHeight: 1.5 }}>
                  Le changement saute aux yeux. Décision en deux secondes.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="wrap" style={{ padding: "80px 22px" }}>
        <Reveal>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 40px" }}>
            Trois temps, dans cet ordre
          </h2>
        </Reveal>
        <div className="three" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 110}>
              <div className="card" style={{ border: `1px solid ${C.rule}`, borderRadius: 12, padding: 22, height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 26, color: C.inkFaint, lineHeight: 1 }}>{i + 1}</span>
                  <span style={{ width: 1, height: 20, background: C.rule }} />
                  <s.icon size={15} color={C.pencil} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-.01em" }}>{s.t}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: C.inkSoft, margin: 0 }}>{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "flex-start", background: C.staleSoft, borderRadius: 10, padding: "14px 16px", maxWidth: 620 }}>
            <AlertTriangle size={15} color={C.stale} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.stale }}>
              Si vous modifiez un paragraphe entre-temps, les propositions qui le visaient
              passent en « périmée » plutôt que de s&apos;appliquer à un texte qui n&apos;existe plus.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Crédits */}
      <section id="credits" style={{ background: C.panel, borderTop: `1px solid ${C.rule}`, padding: "78px 0" }}>
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <Reveal>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.accepted, fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 14 }}>
              <Users size={13} /> Attribution
            </div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 14px", lineHeight: 1.2 }}>
              Personne ne corrige deux fois pour rien
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: C.inkSoft, margin: 0, maxWidth: 460 }}>
              Chaque proposition acceptée porte le nom de son auteur : sous l&apos;article,
              sur son profil, dans l&apos;historique des révisions. C&apos;est ce qui transforme
              une correction ponctuelle en habitude.
            </p>
          </Reveal>
          <Reveal delay={130}>
            <div style={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 12, padding: 22 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 14 }}>
                Ont amélioré cet article
              </div>
              {[
                { n: "Selim Rahmani", i: "SR", c: 4 },
                { n: "Fatou Diallo", i: "FD", c: 3 },
                { n: "Amina Kpodo", i: "AK", c: 1 },
              ].map((p, k) => (
                <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: k ? `1px solid ${C.rule}` : "none" }}>
                  <span style={{ width: 26, height: 26, borderRadius: 26, background: C.pencilSoft, color: C.pencil, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700 }}>{p.i}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.n}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: C.inkFaint }}>
                    {p.c} {p.c > 1 ? "contributions" : "contribution"}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="wrap" style={{ padding: "88px 22px", textAlign: "center" }}>
        <Reveal>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 42, fontWeight: 500, letterSpacing: "-.025em", margin: "0 0 16px", lineHeight: 1.12 }}>
            Votre premier article vous attend
          </h2>
          <p style={{ fontSize: 16, color: C.inkSoft, margin: "0 auto 28px", maxWidth: 420, lineHeight: 1.6 }}>
            Gratuit pour un blog personnel. Vos textes vous appartiennent, exportables
            en Markdown à tout moment.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={authed ? "/write" : "/login"} className="cta" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.ink, color: C.paper, padding: "13px 22px", borderRadius: 9, fontWeight: 600, fontSize: 14.5 }}>
              {authed ? "Écrire un article" : "Créer mon blog"} <ArrowRight size={15} />
            </Link>
            {!authed && (
              <Link href="/login" className="cta" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${C.rule}`, padding: "13px 20px", borderRadius: 9, fontWeight: 500, fontSize: 14.5 }}>
                <GithubMark size={15} /> Continuer avec GitHub
              </Link>
            )}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20, fontSize: 12.5, color: C.inkFaint }}>
            <ShieldCheck size={13} /> Aucune carte bancaire demandée
          </div>
        </Reveal>
      </section>

      <footer style={{ borderTop: `1px solid ${C.rule}`, padding: "26px 0" }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: C.inkFaint }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.ink }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>M</div>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Marge</span>
          </div>
          <span style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
            <Link href="/legal">Conditions</Link>
            <Link href="/privacy">Confidentialité</Link>
            <Link href="/changelog">Journal des versions</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
