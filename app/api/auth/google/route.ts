import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { origin, searchParams } = new URL(req.url);
  const next = searchParams.get("next") ?? "/dashboard";
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(`${origin}/login?error=oauth_not_configured`);
  }

  const redirectUri = `${origin}/api/auth/callback`;
  const state = encodeURIComponent(next);
  const url = getGoogleAuthUrl(redirectUri, state);
  
  return NextResponse.redirect(url);
}
