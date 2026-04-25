/**
 * db.ts
 * Neon serverless Postgres client for RandyBuilds.
 * Uses @neondatabase/serverless — works in Vercel Edge + Node serverless.
 * Lazy-initialised so it doesn't blow up during build when env vars aren't present.
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

/**
 * Initialize database tables if they don't exist.
 * Call this from /api/init-db on first deploy.
 */
export async function initDb() {
  const db = getDb();

  await db`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT,
      avatar_url  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS saved_sites (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
      slug          TEXT UNIQUE NOT NULL,
      business_name TEXT NOT NULL,
      url           TEXT,
      html          TEXT NOT NULL,
      source        TEXT DEFAULT 'claude',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS leads (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      business_name TEXT NOT NULL,
      url           TEXT,
      email         TEXT,
      phone         TEXT,
      city          TEXT,
      province      TEXT DEFAULT 'AB',
      notes         TEXT,
      stage         TEXT DEFAULT 'new',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  return { ok: true };
}
