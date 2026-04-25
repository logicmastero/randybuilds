import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function isSupabaseConfigured() {
  return supabaseUrl && !supabaseUrl.includes("placeholder")
    && supabaseAnonKey && !supabaseAnonKey.includes("placeholder");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // If Supabase isn't configured yet, let requests through (dev mode)
  if (!isSupabaseConfigured()) {
    console.warn("[middleware] Supabase not configured — skipping auth check");
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });

  // Create a Supabase client that can read/write cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet: Array<{name:string; value:string; options:Record<string,unknown>}>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session (this also validates + refreshes the JWT if needed)
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
