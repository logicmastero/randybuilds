import { NextResponse } from "next/server";

export const maxDuration = 10;
// Force dynamic — never cache this
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY ?? "";

  // Attempt a real lightweight Anthropic API call to prove auth works end-to-end
  let apiReachable: boolean | null = null;
  let apiError: string | null = null;

  if (key) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(8000),
      });
      apiReachable = res.ok;
      if (!res.ok) {
        const body = await res.text();
        apiError = `HTTP ${res.status}: ${body.slice(0, 200)}`;
      }
    } catch (e) {
      apiReachable = false;
      apiError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    keyPresent:    !!key,
    keyLen:        key.length,
    keyPrefix:     key ? key.slice(0, 20) : null,
    keyValid:      apiReachable,
    apiError,
    nodeVersion:   process.version,
    region:        process.env.VERCEL_REGION ?? process.env.AWS_REGION ?? "unknown",
    env:           process.env.VERCEL_ENV ?? "unknown",
    timestamp:     new Date().toISOString(),
  });
}
