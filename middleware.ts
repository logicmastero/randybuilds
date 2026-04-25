import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value ||
                req.cookies.get("supabase-auth-token")?.value;
  
  const { pathname } = req.nextUrl;
  
  // Protect dashboard
  if (pathname.startsWith("/dashboard") && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
