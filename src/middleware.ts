import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  isValidReferralCodeFormat,
  normalizeReferralCode,
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/referral/codes";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);

  const ref = request.nextUrl.searchParams.get("ref");
  if (ref?.trim()) {
    const normalized = normalizeReferralCode(ref);
    if (isValidReferralCodeFormat(normalized)) {
      response.cookies.set(REFERRAL_COOKIE, normalized, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
