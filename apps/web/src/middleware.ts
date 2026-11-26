import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: [
    "/",
    "/me",
    "/sources",
    "/sources/:path*",
    "/u/:path*",
    "/@:path*",
    "/connect",
    "/signin",
    "/oauth/consent",
  ],
};
