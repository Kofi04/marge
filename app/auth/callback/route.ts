import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProvisionalHandle } from "@/lib/auth";

/**
 * Callback OAuth / magic link : échange le `code` PKCE contre une session, puis
 * redirige. Si le profil a encore un handle provisoire (premier login), on
 * envoie l'utilisateur choisir son handle sur /welcome.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Destination par défaut = l'espace utilisateur, pas la landing marketing.
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext !== "/" ? rawNext : "/me";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Premier login : rediriger vers l'onboarding si besoin.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .single();
    if (isProvisionalHandle(profile?.handle)) {
      return NextResponse.redirect(`${origin}/welcome?next=${encodeURIComponent(next)}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
