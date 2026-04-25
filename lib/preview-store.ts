/**
 * preview-store.ts
 * Persistent preview storage with Upstash Redis (REST API — works in Vercel serverless).
 * Falls back to in-memory Map if creds not set so local dev + blob URL flow still works.
 * TTL: 30 days (2_592_000 seconds)
 */

const PREVIEW_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

export interface PreviewRecord {
  html: string;
  businessName: string;
  url: string;
  source: string; // "claude", "fallback", "claude-edit", etc
  createdAt: number;
}

// ── In-memory fallback (warm serverless instance only) ────────────────────────
const memStore = new Map<string, PreviewRecord>();

// ── Upstash REST client (no TCP, works everywhere) ────────────────────────────
function getRedisConfig(): { url: string; token: string } | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function redisSet(slug: string, record: PreviewRecord): Promise<void> {
  const cfg = getRedisConfig();
  if (!cfg) return;
  const key = `preview:${slug}`;
  const res = await fetch(`${cfg.url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: JSON.stringify(record), ex: PREVIEW_TTL }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[preview-store] Redis SET failed (${res.status}): ${text}`);
  }
}

async function redisGet(slug: string): Promise<PreviewRecord | null> {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  const key = `preview:${slug}`;
  const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) return null;
  const json = await res.json() as { result: string | null };
  if (!json.result) return null;
  try {
    return JSON.parse(json.result) as PreviewRecord;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function savePreview(slug: string, record: PreviewRecord): Promise<void> {
  // Always write to mem so blob-URL instant display keeps working
  memStore.set(slug, record);
  if (memStore.size > 500) {
    const oldest = [...memStore.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    memStore.delete(oldest[0]);
  }
  // Persist to Redis (fire-and-forget — don't block the response)
  redisSet(slug, record).catch(e => console.error("[preview-store] redisSet error:", e));
}

export async function getPreview(slug: string): Promise<PreviewRecord | null> {
  // Try Redis first (cross-instance, persistent)
  const fromRedis = await redisGet(slug);
  if (fromRedis) {
    // Warm the mem cache so subsequent hits on this instance are instant
    memStore.set(slug, fromRedis);
    return fromRedis;
  }
  // Fallback to in-memory (same warm instance only)
  return memStore.get(slug) ?? null;
}

export function isRedisConfigured(): boolean {
  return getRedisConfig() !== null;
}
