import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true, loggedOut: true });
  const c = clearSessionCookie();
  res.cookies.set(c.name, c.value, {
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite,
    maxAge: c.maxAge,
    path: c.path,
  });
  return res;
}
