import "server-only";
import { prisma } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n/config";

export async function readUserLocale(userId: string): Promise<Locale | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });

  return isLocale(user?.locale) ? user.locale : null;
}
