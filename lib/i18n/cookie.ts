import type { NextResponse } from "next/server";

import { type Locale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./config";

export function setLocaleCookie(res: NextResponse, locale: Locale): void {
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: LOCALE_COOKIE_MAX_AGE, httpOnly: false, secure: process.env.NODE_ENV === "production" });
}
