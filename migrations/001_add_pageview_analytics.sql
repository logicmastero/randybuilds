-- Migration: Add persistent pageview analytics table
-- Run this on your Neon database to set up analytics tracking

CREATE TABLE IF NOT EXISTS pageview_analytics (
  id BIGSERIAL PRIMARY KEY,
  site_slug TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'pageview', 'scroll', 'click', 'form_start', 'form_submit'
  page_path TEXT,
  scroll_depth INTEGER, -- 0-100, percentage
  time_on_page INTEGER, -- milliseconds
  viewport_width INTEGER,
  viewport_height INTEGER,
  referrer TEXT,
  user_agent TEXT,
  session_id TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_pageview_site_timestamp 
  ON pageview_analytics(site_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pageview_event 
  ON pageview_analytics(site_slug, event_type);
CREATE INDEX IF NOT EXISTS idx_pageview_session 
  ON pageview_analytics(session_id);

-- View for conversion funnel analysis
CREATE OR REPLACE VIEW pageview_funnel AS
SELECT 
  site_slug,
  COUNT(*) as total_pageviews,
  COUNT(CASE WHEN event_type = 'form_start' THEN 1 END) as form_starts,
  COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) as form_submits,
  ROUND(100.0 * COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) / NULLIF(COUNT(*), 0), 2) as conversion_rate,
  AVG(scroll_depth) as avg_scroll_depth,
  AVG(time_on_page) as avg_time_on_page_ms
FROM pageview_analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY site_slug
ORDER BY total_pageviews DESC;

-- Optional: Auto-cleanup old analytics data (older than 90 days)
-- Can be run as a scheduled job
-- DELETE FROM pageview_analytics WHERE created_at < NOW() - INTERVAL '90 days';
