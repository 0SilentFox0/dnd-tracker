import { prisma } from '@/lib/db';
import { utcDay } from '@/lib/utils/admin/seen-cookie';

export type ActivityInput = {
    userId: string;
    ip: string | null;
    country: string | null;
    device: string | null;
    now?: Date;
};

const errorName = (e: unknown) => (e instanceof Error ? e.name : 'unknown');

export async function recordActivity(input: ActivityInput): Promise<void> {
    const now = input.now ?? new Date();

    const { userId, ip, country, device } = input;

    try {
        await prisma.$executeRaw`INSERT INTO user_activity_days ("userId", day) VALUES (${userId}, ${utcDay(now)}::date) ON CONFLICT DO NOTHING`;

        if (!ip) return;

        await prisma.$executeRaw`INSERT INTO user_access AS a ("userId", ip, country, device, "firstSeen", "lastSeen", days)
VALUES (${userId}, ${ip}, ${country}, ${device}, ${now}, ${now}, 1)
ON CONFLICT ("userId", ip) DO UPDATE SET
  "lastSeen" = EXCLUDED."lastSeen",
  country = COALESCE(EXCLUDED.country, a.country),
  device = COALESCE(EXCLUDED.device, a.device),
  days = a.days + CASE WHEN a."lastSeen"::date < EXCLUDED."lastSeen"::date THEN 1 ELSE 0 END`;
    } catch (e) {
        console.warn('[admin] activity write failed', errorName(e));
    }
}
