import { cache } from "react";
import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, isLocale, type Locale, LOCALE_COOKIE } from "./config";
import { negotiateLocale } from "./resolve-locale";

import "server-only";
import { hashToken } from "@/lib/ai/api-tokens";
import { prisma } from "@/lib/db";
import { bearerToken } from "@/lib/utils/api/bearer";

const tokenOwnerLocale = cache(async (token: string): Promise<Locale> => {
  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { revokedAt: true, userId: true } }).catch(() => null);

  if (!row || row.revokedAt) return "en";

  const owner = await prisma.user.findUnique({ where: { id: row.userId }, select: { locale: true } }).catch(() => null);

  return isLocale(owner?.locale) ? owner.locale : "en";
});

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  const negotiated = negotiateLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });

  if (negotiated) return negotiated;

  const token = bearerToken({ headers: headerStore });

  return token ? tokenOwnerLocale(token) : DEFAULT_LOCALE;
}
