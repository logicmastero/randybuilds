/**
 * db.ts
 * Neon serverless Postgres client for RandyBuilds.
 * Uses @neondatabase/serverless — works in Vercel Edge + Node serverless.
 */

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = neon(process.env.DATABASE_URL);

/**
 * Initialize database tables if they don't exist.
 * Call this from a setup route or on first deploy.
 */
export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT,
      avatar_url  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
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

  await sql`
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
