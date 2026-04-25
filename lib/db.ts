/**
 * db.ts — RandyBuilds / Sitecraft
 * Neon serverless Postgres client. Lazy-init so build doesn't fail without env vars.
 *
 * SCHEMA OVERVIEW
 * ───────────────
 * users            — authenticated users (Google OAuth)
 * preview_sessions — anonymous AI-generated previews (30-day TTL)
 * saved_sites      — user-saved sites with full edit history
 * site_versions    — version history for saved_sites
 * leads            — CRM-lite lead pipeline
 * generation_log   — every AI generation for analytics
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  _sql = neon(url);
  return _sql;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider: string;
  plan: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PreviewSession {
  id: string;
  slug: string;
  business_name: string;
  input_url?: string;
  input_desc?: string;
  html: string;
  source: string;
  industry?: string;
  color_scheme?: string;
  generation_ms?: number;
  view_count: number;
  claimed_by?: string;
  expires_at: string;
  created_at: string;
}

export interface SavedSite {
  id: string;
  user_id?: string;
  slug: string;
  business_name: string;
  url?: string;
  html: string;
  source: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  industry?: string;
  color_scheme?: string;
  generation_ms?: number;
  view_count: number;
  is_published: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  business_name: string;
  owner_name?: string;
  business_type?: string;
  url?: string;
  email?: string;
  phone?: string;
  city?: string;
  province: string;
  notes?: string;
  stage: string;
  deal_value?: number;
  outreach_date?: string;
  follow_up_date?: string;
  source: string;
  facebook_url?: string;
  instagram_url?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function upsertUser(data: {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
}): Promise<User> {
  const db = getDb();
  const rows = await db`
    INSERT INTO users (id, email, name, avatar_url, provider, last_seen_at)
    VALUES (${data.id}, ${data.email}, ${data.name ?? null}, ${data.avatar_url ?? null}, ${data.provider ?? "google"}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      name         = EXCLUDED.name,
      avatar_url   = EXCLUDED.avatar_url,
      last_seen_at = NOW(),
      updated_at   = NOW()
    RETURNING *
  `;
  return rows[0] as User;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

// ─── Preview session helpers ──────────────────────────────────────────────────

export async function savePreviewSession(data: {
  slug: string;
  business_name: string;
  html: string;
  input_url?: string;
  input_desc?: string;
  source?: string;
  industry?: string;
  color_scheme?: string;
  generation_ms?: number;
}): Promise<PreviewSession> {
  const db = getDb();
  const rows = await db`
    INSERT INTO preview_sessions (slug, business_name, html, input_url, input_desc, source, industry, color_scheme, generation_ms)
    VALUES (
      ${data.slug},
      ${data.business_name},
      ${data.html},
      ${data.input_url ?? null},
      ${data.input_desc ?? null},
      ${data.source ?? "claude"},
      ${data.industry ?? null},
      ${data.color_scheme ?? null},
      ${data.generation_ms ?? null}
    )
    ON CONFLICT (slug) DO UPDATE SET
      html          = EXCLUDED.html,
      business_name = EXCLUDED.business_name,
      generation_ms = EXCLUDED.generation_ms
    RETURNING *
  `;
  return rows[0] as PreviewSession;
}

export async function getPreviewSession(slug: string): Promise<PreviewSession | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM preview_sessions
    WHERE slug = ${slug} AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `;
  if (rows[0]) {
    // bump view count async
    db`UPDATE preview_sessions SET view_count = view_count + 1 WHERE slug = ${slug}`.catch(() => {});
  }
  return (rows[0] as PreviewSession) ?? null;
}

// ─── Saved sites helpers ──────────────────────────────────────────────────────

export async function saveSite(data: {
  user_id: string;
  slug: string;
  business_name: string;
  html: string;
  url?: string;
  source?: string;
  industry?: string;
  color_scheme?: string;
  generation_ms?: number;
}): Promise<SavedSite> {
  const db = getDb();
  const rows = await db`
    INSERT INTO saved_sites (user_id, slug, business_name, html, url, source, industry, color_scheme, generation_ms)
    VALUES (
      ${data.user_id},
      ${data.slug},
      ${data.business_name},
      ${data.html},
      ${data.url ?? null},
      ${data.source ?? "claude"},
      ${data.industry ?? null},
      ${data.color_scheme ?? null},
      ${data.generation_ms ?? null}
    )
    ON CONFLICT (slug) DO UPDATE SET
      html          = EXCLUDED.html,
      business_name = EXCLUDED.business_name,
      updated_at    = NOW()
    RETURNING *
  `;
  return rows[0] as SavedSite;
}

export async function getUserSites(user_id: string): Promise<SavedSite[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM saved_sites
    WHERE user_id = ${user_id} AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `;
  return rows as SavedSite[];
}

export async function getSiteBySlug(slug: string): Promise<SavedSite | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM saved_sites WHERE slug = ${slug} AND deleted_at IS NULL LIMIT 1
  `;
  return (rows[0] as SavedSite) ?? null;
}

// ─── Leads helpers ────────────────────────────────────────────────────────────

export async function createLead(data: Partial<Lead> & { business_name: string }): Promise<Lead> {
  const db = getDb();
  const rows = await db`
    INSERT INTO leads (
      business_name, owner_name, business_type, url, email, phone,
      city, province, notes, stage, deal_value, outreach_date,
      follow_up_date, source, facebook_url, instagram_url
    ) VALUES (
      ${data.business_name},
      ${data.owner_name ?? null},
      ${data.business_type ?? null},
      ${data.url ?? null},
      ${data.email ?? null},
      ${data.phone ?? null},
      ${data.city ?? null},
      ${data.province ?? "AB"},
      ${data.notes ?? null},
      ${data.stage ?? "new"},
      ${data.deal_value ?? null},
      ${data.outreach_date ?? null},
      ${data.follow_up_date ?? null},
      ${data.source ?? "manual"},
      ${data.facebook_url ?? null},
      ${data.instagram_url ?? null}
    )
    RETURNING *
  `;
  return rows[0] as Lead;
}

export async function getLeads(filters?: { stage?: string }): Promise<Lead[]> {
  const db = getDb();
  if (filters?.stage) {
    return db`
      SELECT * FROM leads WHERE deleted_at IS NULL AND stage = ${filters.stage}
      ORDER BY follow_up_date ASC NULLS LAST, created_at DESC
    ` as unknown as Promise<Lead[]>;
  }
  return db`
    SELECT * FROM leads WHERE deleted_at IS NULL
    ORDER BY follow_up_date ASC NULLS LAST, created_at DESC
  ` as unknown as Promise<Lead[]>;
}

// ─── Generation log ───────────────────────────────────────────────────────────

export async function logGeneration(data: {
  user_id?: string;
  session_id?: string;
  input_type: "url" | "description" | "edit";
  input_value?: string;
  model?: string;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
}): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO generation_log (user_id, session_id, input_type, input_value, model, duration_ms, success, error_message)
    VALUES (
      ${data.user_id ?? null},
      ${data.session_id ?? null},
      ${data.input_type},
      ${data.input_value ?? null},
      ${data.model ?? "claude-opus-4-5"},
      ${data.duration_ms ?? null},
      ${data.success},
      ${data.error_message ?? null}
    )
  `;
}

// ─── DB init (run once on deploy) ────────────────────────────────────────────

export async function initDb() {
  // Tables and indexes are managed via direct Neon migrations.
  // This function is kept as a health check endpoint.
  const db = getDb();
  const rows = await db`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  return {
    ok: true,
    tables: rows.map((r: { table_name: string }) => r.table_name),
  };
}
