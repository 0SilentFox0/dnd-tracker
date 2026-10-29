import { APP_TIME_ZONE } from "./config";

export const TZ_COOKIE = "TZ";

export const TZ_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;

  try {
    new Intl.DateTimeFormat("en", { timeZone: value });

    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(value: unknown): string {
  return isTimeZone(value) ? value : APP_TIME_ZONE;
}
