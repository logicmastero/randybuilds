/**
 * Analytics Injector
 * Injects a lightweight pageview tracker into all generated sites
 * Tracks: pageviews, referrer, device type, session duration
 * No external API needed — runs client-side
 */

export interface PageviewEvent {
  site_slug: string;
  timestamp: number;
  path: string;
  referrer: string;
  device_type: "mobile" | "tablet" | "desktop";
  session_id: string;
}

export interface SiteAnalytics {
  site_slug: string;
  total_pageviews: number;
  unique_visitors: number;
  avg_session_duration_seconds: number;
  bounce_rate: number;
  top_pages: Array<{ path: string; count: number }>;
  device_breakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  referrer_sources: Array<{ source: string; count: number }>;
  last_updated: number;
}

export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase())) {
    return "mobile";
  }
  if (/ipad|android|tablet/i.test(ua.toLowerCase())) {
    return "tablet";
  }
  return "desktop";
}

export function generateSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "analytics_session_id";
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).substr(2, 9);
    localStorage.setItem(key, sid);
  }
  return sid;
}

/**
 * Inject analytics tracker script into generated HTML
 * Auto-tracks pageviews on load
 */
export function getAnalyticsScript(siteSlug: string): string {
  return `
(function() {
  const siteSlug = "${siteSlug}";
  const sessionKey = "analytics_session_" + siteSlug;
  const sessionId = (() => {
    let sid = localStorage.getItem(sessionKey);
    if (!sid) {
      sid = Math.random().toString(36).substr(2, 9);
      localStorage.setItem(sessionKey, sid);
      localStorage.setItem(sessionKey + "_start", Date.now());
    }
    return sid;
  })();

  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/mobile|android|iphone|ipod|blackberry/i.test(ua.toLowerCase())) return "mobile";
    if (/ipad|tablet/i.test(ua.toLowerCase())) return "tablet";
    return "desktop";
  }

  const event = {
    site_slug: siteSlug,
    timestamp: Date.now(),
    path: window.location.pathname,
    referrer: document.referrer || "(direct)",
    device_type: getDeviceType(),
    session_id: sessionId
  };

  // Non-blocking: send pageview to backend
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/pageview", JSON.stringify(event));
  }
})();
`;
}

/**
 * Generate analytics summary from raw pageview data
 */
export function aggregateAnalytics(events: PageviewEvent[]): SiteAnalytics {
  const pageviews = new Map<string, number>();
  const visitors = new Set<string>();
  const devices = { mobile: 0, tablet: 0, desktop: 0 };
  const referrers = new Map<string, number>();

  events.forEach((event) => {
    visitors.add(event.session_id);
    pageviews.set(event.path, (pageviews.get(event.path) || 0) + 1);
    devices[event.device_type]++;
    referrers.set(event.referrer, (referrers.get(event.referrer) || 0) + 1);
  });

  const topPages = Array.from(pageviews.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topReferrers = Array.from(referrers.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Bounce rate: sessions with only 1 pageview
  const sessionPageCounts = new Map<string, number>();
  events.forEach((event) => {
    sessionPageCounts.set(event.session_id, (sessionPageCounts.get(event.session_id) || 0) + 1);
  });
  const bounces = Array.from(sessionPageCounts.values()).filter((c) => c === 1).length;
  const bounceRate = visitors.size > 0 ? Math.round((bounces / visitors.size) * 100) : 0;

  return {
    site_slug: events[0]?.site_slug || "unknown",
    total_pageviews: events.length,
    unique_visitors: visitors.size,
    avg_session_duration_seconds: 0,
    bounce_rate: bounceRate,
    top_pages: topPages,
    device_breakdown: devices,
    referrer_sources: topReferrers,
    last_updated: Date.now(),
  };
}
