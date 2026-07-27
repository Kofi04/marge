import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isProvisionalHandle } from "@/lib/auth";

/**
 * Variante du callback pour les liens e-mail au format `token_hash` (magic link
 * selon le template Supabase). Vérifie l'OTP puis redirige comme le callback.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext !== "/" ? rawNext : "/me";

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

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
