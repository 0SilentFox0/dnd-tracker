import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readLocaleCookie, setLocaleCookie } from "@/lib/i18n/cookie";
import { localeSchema } from "@/lib/schemas/locale";
import { syncUserLocale } from "@/lib/server/users/locale";
import { getProfileTimeZone } from "@/lib/server/users/time-zone";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();

    const [locale, timeZone] = userId
      ? await Promise.all([syncUserLocale(userId, readLocaleCookie(req)), getProfileTimeZone(userId)])
      : [null, null];

    const res = NextResponse.json({ locale, timeZone }, { headers: PRIVATE_NO_STORE_HEADERS });

    if (locale) setLocaleCookie(res, locale, req);

    return res;
  } catch (error) {
    return handleApiError(error, { action: "read locale" });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await parseBody(localeSchema, req);

    if (body instanceof NextResponse) return body;

    const userId = await getSessionUserId();

    if (userId) {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { locale: body.locale, timeZone: body.timeZone },
      });
    }

    const res = NextResponse.json({ locale: body.locale, timeZone: body.timeZone });

    if (body.locale) setLocaleCookie(res, body.locale, req);

    return res;
  } catch (error) {
    return handleApiError(error, { action: "save locale" });
  }
}
