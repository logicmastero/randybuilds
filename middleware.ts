import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/api/crm/:path*", "/api/projects/:path*"],
};

export async function middleware(req: NextRequest) {
  const user = await getSessionFromRequest(req);

  // Protect dashboard pages
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect CRM and projects API routes
  if (
    req.nextUrl.pathname.startsWith("/api/crm") ||
    req.nextUrl.pathname.startsWith("/api/projects")
  ) {
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
  }

  return NextResponse.next();
}
