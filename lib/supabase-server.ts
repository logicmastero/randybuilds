/**
 * supabase-server.ts — DEPRECATED
 * Supabase has been removed. Use lib/auth.ts for session management.
 */
export function getServerSupabase(): never {
  throw new Error("Supabase has been removed. Use getSessionFromRequest() from lib/auth.ts");
}
export function getSupabaseAdmin(): never {
  throw new Error("Supabase has been removed.");
}
