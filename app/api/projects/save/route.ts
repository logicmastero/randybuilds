import { NextRequest, NextResponse } from "next/server";

// Save a generated project to the user's local storage key
// In production this would write to Supabase projects table
export async function POST(req: NextRequest) {
  const { userId, project } = await req.json();
  if (!userId || !project) {
    return NextResponse.json({ ok: false, error: "Missing userId or project" }, { status: 400 });
  }

  // When Supabase service role is available, save to DB
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (svcKey && sbUrl && !svcKey.startsWith("placeholder")) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(sbUrl, svcKey);
      const { data, error } = await admin.from("projects").upsert({
        id: project.id,
        user_id: userId,
        business_name: project.businessName,
        source_url: project.sourceUrl || null,
        html: project.html || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, saved: "db", data });
    } catch (e: unknown) {
      console.error("[save-project] DB save failed:", e);
      // Fall through to client-side storage response
    }
  }

  // Fallback: tell client to save locally
  return NextResponse.json({ ok: true, saved: "local" });
}
