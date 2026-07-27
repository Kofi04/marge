import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile, isProvisionalHandle } from "@/lib/auth";

/**
 * « Mon espace » : point d'entrée authentifié. Renvoie vers le profil de
 * l'utilisateur (ou /welcome si le handle n'est pas encore choisi, /login si
 * non connecté). Évite d'atterrir sur la landing marketing après le login.
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const { userId, profile } = await getSessionProfile();
  if (!userId) return NextResponse.redirect(`${origin}/login`);
  if (!profile || isProvisionalHandle(profile.handle)) return NextResponse.redirect(`${origin}/welcome`);
  return NextResponse.redirect(`${origin}/home`);
}
