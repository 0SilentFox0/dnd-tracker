import "server-only";
import { prisma } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n/config";

export async function syncUserLocale(userId: string, cookieLocale: string | undefined): Promise<Locale | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });

  if (isLocale(user?.locale)) return user.locale;

  if (isLocale(cookieLocale)) await prisma.user.updateMany({ where: { id: userId, locale: null }, data: { locale: cookieLocale } });

  return null;
}
