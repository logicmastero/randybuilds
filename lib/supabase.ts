/**
 * supabase.ts — DEPRECATED
 * Supabase has been removed. Auth is now handled via Google OAuth + JWT sessions.
 * This stub exists so any lingering imports don't crash the build.
 */

export function isSupabaseConfigured(): boolean {
  return false;
}

export function getSupabaseClient() {
  throw new Error("Supabase has been removed. Use /api/auth/google for sign-in.");
}

export const supabase = null;
