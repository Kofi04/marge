// Edge Function `notify-email` — envoie un e-mail à chaque notification insérée.
//
// Déclenchée par un Database Webhook Supabase (INSERT sur `notifications`).
// Elle tourne dans l'infrastructure Supabase : aucun déploiement Next requis,
// et elle reste proche de la base (eu-central-1). Le flux :
//   INSERT notifications  ->  webhook  ->  cette fonction  ->  Resend
//
// Secrets attendus (Dashboard > Edge Functions > Secrets, ou `supabase secrets set`) :
//   RESEND_API_KEY     clé API Resend
//   MARGE_FROM_EMAIL   expéditeur vérifié (ex. "Marge <notifications@ton-domaine>")
//   MARGE_SITE_URL     base des liens (ex. https://marge.app) — défaut localhost:4321
//
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotificationKind =
  | "suggestion_received"
  | "suggestion_accepted"
  | "suggestion_rejected"
  | "comment";

interface NotificationRecord {
  id: string;
  recipient_id: string;
  kind: NotificationKind;
  payload: Record<string, string>;
  created_at: string;
}

interface WebhookBody {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: NotificationRecord | null;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("MARGE_FROM_EMAIL") ?? "Marge <onboarding@resend.dev>";
const SITE_URL = (Deno.env.get("MARGE_SITE_URL") ?? "http://localhost:4321").replace(/\/$/, "");

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/** Réponse JSON courte. */
function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Construit sujet + corps HTML à partir du type et du payload résolu. */
function compose(
  kind: NotificationKind,
  ctx: { title: string; url: string; who: string; revision?: string },
): { subject: string; html: string } | null {
  const link = `<a href="${ctx.url}" style="color:#3B4CC0">« ${escapeHtml(ctx.title)} »</a>`;
  switch (kind) {
    case "suggestion_received":
      return {
        subject: `Nouvelle proposition sur « ${ctx.title} »`,
        html: `<p>${escapeHtml(ctx.who)} a proposé une réécriture sur ${link}.</p><p>Ouvrez la marge pour l'accepter ou la refuser.</p>`,
      };
    case "suggestion_accepted":
      return {
        subject: `Votre proposition a été acceptée`,
        html: `<p>Votre proposition sur ${link} a été intégrée (révision ${escapeHtml(ctx.revision ?? "+1")}).</p><p>Merci pour votre contribution — elle apparaît désormais dans les crédits.</p>`,
      };
    case "suggestion_rejected":
      return {
        subject: `Votre proposition n'a pas été retenue`,
        html: `<p>Votre proposition sur ${link} n'a pas été retenue cette fois.</p>`,
      };
    case "comment":
      return {
        subject: `Nouveau message sur votre proposition`,
        html: `<p>${escapeHtml(ctx.who)} a commenté votre proposition sur ${link}.</p>`,
      };
    default:
      return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const rec = body.record;
  if (body.type !== "INSERT" || body.table !== "notifications" || !rec) {
    return json(200, { skipped: "not_a_notification_insert" });
  }

  // 1) Préférence + nom du destinataire.
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, email_notifications")
    .eq("id", rec.recipient_id)
    .single();
  if (!profile) return json(200, { skipped: "no_profile" });
  if (profile.email_notifications === false) return json(200, { skipped: "opted_out" });

  // 2) Adresse e-mail (dans auth.users, via la service key).
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(rec.recipient_id);
  const email = userData?.user?.email;
  if (userErr || !email) return json(200, { skipped: "no_email" });

  // 3) Contexte : titre de l'article, lien, acteur.
  let title = "un article";
  let url = SITE_URL;
  const articleId = rec.payload.article_id;
  if (articleId) {
    const { data: art } = await admin
      .from("articles")
      .select("slug, title, author_id")
      .eq("id", articleId)
      .single();
    if (art) {
      title = art.title;
      const { data: author } = await admin
        .from("profiles")
        .select("handle")
        .eq("id", art.author_id)
        .single();
      url = `${SITE_URL}/@${author?.handle ?? ""}/${art.slug}`;
    }
  }

  let who = "Quelqu'un";
  if (rec.payload.author_id) {
    const { data: actor } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", rec.payload.author_id)
      .single();
    if (actor?.display_name) who = actor.display_name;
  }

  const mail = compose(rec.kind, { title, url, who, revision: rec.payload.revision });
  if (!mail) return json(200, { skipped: "unknown_kind" });

  // 4) Envoi via Resend.
  if (!RESEND_API_KEY) return json(200, { skipped: "no_resend_key" });
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: mail.subject,
      html: `${mail.html}<p style="color:#9B9EA3;font-size:12px;margin-top:24px">Vous recevez cet e-mail car les notifications sont activées. Gérez-les dans vos réglages Marge.</p>`,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return json(502, { error: "resend_failed", detail });
  }
  return json(200, { sent: true });
});
