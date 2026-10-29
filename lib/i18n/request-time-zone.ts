import { cookies } from "next/headers";

import { resolveTimeZone, TZ_COOKIE } from "./time-zone";

import "server-only";

export async function getRequestTimeZone(): Promise<string> {
  const cookieStore = await cookies();

  const raw = cookieStore.get(TZ_COOKIE)?.value;

  return resolveTimeZone(raw && decodeURIComponent(raw));
}
