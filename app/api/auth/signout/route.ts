import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

async function handleSignOut(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return res;
  }

  // Create server client to sign out and clear cookies
  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut();

  // Also nuke any lingering auth cookies manually
  req.cookies.getAll().forEach(cookie => {
    if (cookie.name.includes("auth") || cookie.name.startsWith("sb-")) {
      res.cookies.set(cookie.name, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  });

  return res;
}

export async function GET(req: NextRequest) { return handleSignOut(req); }
export async function POST(req: NextRequest) { return handleSignOut(req); }
