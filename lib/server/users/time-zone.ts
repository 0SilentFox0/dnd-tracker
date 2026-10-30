import "server-only";
import { prisma } from "@/lib/db";
import { isTimeZone } from "@/lib/i18n/time-zone";

export async function getProfileTimeZone(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });

  return isTimeZone(user?.timeZone) ? user.timeZone : null;
}
