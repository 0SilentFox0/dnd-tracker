import type { NextResponse } from "next/server";

import { type Locale, LOCALE_COOKIE } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function setLocaleCookie(res: NextResponse, locale: Locale): void {
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: ONE_YEAR_SECONDS, httpOnly: false, secure: process.env.NODE_ENV === "production" });
}
