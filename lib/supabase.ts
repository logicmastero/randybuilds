import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Check if Supabase is configured ──────────────────────────────────────────
export function isSupabaseConfigured() {
  return (
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("placeholder") &&
    !supabaseAnonKey.includes("placeholder")
  );
}

// ── Browser client (React components / client components) ─────────────────────
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;
export function getSupabaseClient() {
  if (!_browserClient) {
    _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
}
export const supabase = getSupabaseClient();

// ── Server client (Server Components, uses Next.js cookies()) ─────────────────
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}

// ── Route handler client (API routes — takes req + res) ───────────────────────
export function createSupabaseRouteHandlerClient(
  req: NextRequest,
  res: NextResponse
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

// ── Middleware client (for middleware.ts) ─────────────────────────────────────
export function createSupabaseMiddlewareClient(
  req: NextRequest,
  res: NextResponse
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

// ── Service role admin client (API routes only — never expose to browser) ─────
export function getSupabaseAdmin() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
