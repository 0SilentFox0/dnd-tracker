"use client";

import { useEffect, useSyncExternalStore } from "react";

import { APP_TIME_ZONE } from "./config";
import { isTimeZone, TZ_COOKIE, TZ_COOKIE_MAX_AGE } from "./time-zone";

const noopSubscribe = () => () => {};

function readBrowserTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return isTimeZone(zone) ? zone : APP_TIME_ZONE;
}

function readTimeZoneCookie(): string | undefined {
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${TZ_COOKIE}=`))
    ?.slice(TZ_COOKIE.length + 1);

  return raw && decodeURIComponent(raw);
}

export function useSyncTimeZoneCookie(): void {
  useEffect(() => {
    const zone = readBrowserTimeZone();

    if (readTimeZoneCookie() === zone) return;

    const secure = location.protocol === "https:" ? "; secure" : "";

    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${TZ_COOKIE_MAX_AGE}; samesite=lax${secure}`;
  }, []);
}

export function useBrowserTimeZone(): string {
  return useSyncExternalStore(noopSubscribe, readBrowserTimeZone, () => APP_TIME_ZONE);
}
