import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return (
    supabaseUrl.length > 0 &&
    supabaseAnonKey.length > 0 &&
    !supabaseUrl.includes("placeholder") &&
    supabaseUrl.startsWith("https://")
  );
}

// Browser-only singleton — safe to import in "use client" components
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    // Return a stub that won't crash the build
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({}),
        signInWithOAuth: async () => ({ error: new Error("Supabase not configured") }),
        signInWithOtp: async () => ({ error: new Error("Supabase not configured") }),
      },
    } as unknown as ReturnType<typeof createBrowserClient>;
  }
  if (!_client) {
    _client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

export const supabase = getSupabaseClient();
