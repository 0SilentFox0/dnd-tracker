import type { NextResponse } from "next/server";

import { type Locale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./config";

import { isSecureRequest } from "@/lib/utils/api/same-origin";

export function setLocaleCookie(res: NextResponse, locale: Locale, req: Request): void {
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: LOCALE_COOKIE_MAX_AGE, httpOnly: false, secure: isSecureRequest(req) });
}

export function readLocaleCookie(req: Request): string | undefined {
  return req.headers
    .get("cookie")
    ?.split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
}
