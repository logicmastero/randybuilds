import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

async function handleSignOut(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/`);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || url.includes("placeholder")) return res;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet: Array<{name:string; value:string; options:Record<string,unknown>}>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
        });
      },
    },
  });
  await supabase.auth.signOut();
  req.cookies.getAll().forEach(c => {
    if (c.name.includes("auth") || c.name.startsWith("sb-")) {
      res.cookies.set(c.name, "", { expires: new Date(0), path: "/", httpOnly: true });
    }
  });
  return res;
}

export async function GET(req: NextRequest) { return handleSignOut(req); }
export async function POST(req: NextRequest) { return handleSignOut(req); }
