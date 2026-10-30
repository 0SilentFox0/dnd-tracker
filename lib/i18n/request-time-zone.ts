import { cache } from "react";
import { cookies } from "next/headers";

import { isTimeZone, resolveTimeZone, TZ_COOKIE } from "./time-zone";

import "server-only";
import { getSessionUserId } from "@/lib/auth";
import { getProfileTimeZone } from "@/lib/server/users/time-zone";

async function cookieTimeZone(): Promise<string> {
  const cookieStore = await cookies();

  const raw = cookieStore.get(TZ_COOKIE)?.value;

  try {
    return resolveTimeZone(raw && decodeURIComponent(raw));
  } catch {
    return resolveTimeZone(undefined);
  }
}

export const getRequestTimeZone = cache(async (): Promise<string> => {
  const userId = await getSessionUserId().catch(() => null);

  const profile = userId ? await getProfileTimeZone(userId).catch(() => null) : null;

  return isTimeZone(profile) ? profile : cookieTimeZone();
});
