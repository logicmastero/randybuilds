import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  getGoogleUserInfo,
  signSession,
  sessionCookieOptions,
} from "../../../../lib/auth";
import { upsertUser } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    console.error("[auth/callback] Google returned error:", errorParam);
    return NextResponse.redirect(`${origin}/login?error=google_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const redirectUri = `${origin}/api/auth/callback`;

  // Exchange code for tokens
  const tokens = await exchangeGoogleCode(code, redirectUri);
  if (!tokens?.access_token) {
    console.error("[auth/callback] Token exchange failed");
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Get user info
  const googleUser = await getGoogleUserInfo(tokens.access_token);
  if (!googleUser?.email) {
    return NextResponse.redirect(`${origin}/login?error=no_user_info`);
  }

  // Upsert to Neon DB
  const userId = `google_${googleUser.sub}`;
  try {
    await upsertUser({
      id: userId,
      email: googleUser.email,
      name: googleUser.name,
      avatar_url: googleUser.picture,
      provider: "google",
    });
  } catch (e) {
    console.error("[auth/callback] Neon upsert failed:", e);
    // Non-fatal — continue with login
  }

  // Sign JWT session
  const sessionToken = await signSession({
    id: userId,
    email: googleUser.email,
    name: googleUser.name,
    avatar_url: googleUser.picture,
  });

  // Decode state to get redirect path
  let next = "/dashboard";
  if (state) {
    try { next = decodeURIComponent(state); } catch {}
    if (!next.startsWith("/")) next = "/dashboard";
  }

  const res = NextResponse.redirect(`${origin}${next}`);
  const cookieOpts = sessionCookieOptions(sessionToken);
  res.cookies.set(cookieOpts.name, cookieOpts.value, {
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    maxAge: cookieOpts.maxAge,
    path: cookieOpts.path,
  });

  return res;
}
