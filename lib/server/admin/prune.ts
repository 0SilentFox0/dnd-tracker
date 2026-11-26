import { DAY_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';

const ACCESS_RETENTION_DAYS = 180;

const ACTIVITY_RETENTION_DAYS = 400;

export async function pruneAdminData(now = new Date()): Promise<void> {
    await prisma.userAccess.deleteMany({
        where: {
            lastSeen: {
                lt: new Date(now.getTime() - ACCESS_RETENTION_DAYS * DAY_MS),
            },
        },
    });
    await prisma.userActivityDay.deleteMany({
        where: {
            day: {
                lt: new Date(now.getTime() - ACTIVITY_RETENTION_DAYS * DAY_MS),
            },
        },
    });
}
