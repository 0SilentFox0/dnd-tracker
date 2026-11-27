#!/usr/bin/env tsx
/**
 * Seeds 60 days of activity, shared-IP groups, deletions and admin actions for the existing users of the LOCAL
 * database (admin panel live check). Refuses a non-local DATABASE_URL. `--clean` only wipes the 4 admin tables.
 *
 *   pnpm admin:seed [--clean]
 */
import { DAY_MS } from '@/lib/constants/time';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const DAYS = 60;

const COUNTRIES = ['UA', 'PL', 'DE', 'US', 'GB'];

const DEVICES = ['Chrome · macOS', 'Firefox · Windows', 'Safari · iOS'];

const SHARED_GROUPS = [
    { ip: '203.0.113.10', size: 2 },
    { ip: '203.0.113.20', size: 3 },
    { ip: '203.0.113.30', size: 6 },
];

function utcMidnight(daysAgo: number): Date {
    const d = new Date(Date.now() - daysAgo * DAY_MS);

    return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    );
}

async function main() {
    assertSeedTarget(process.env.DATABASE_URL, false);

    const { prisma } = await import('@/lib/db');

    try {
        await prisma.$transaction([
            prisma.userAccess.deleteMany(),
            prisma.userActivityDay.deleteMany(),
            prisma.accountDeletion.deleteMany(),
            prisma.adminAction.deleteMany(),
        ]);

        if (process.argv.includes('--clean')) {
            console.log('admin tables cleaned');

            return;
        }

        const users = await prisma.user.findMany({
            select: { id: true },
            orderBy: { createdAt: 'asc' },
            take: 20,
        });

        if (!users.length) throw new Error('no users to seed');

        const days: { userId: string; day: Date }[] = [];

        users.forEach((u, i) => {
            const every = (i % 4) + 1;

            for (let d = 0; d < DAYS; d += 1)
                if ((d + i) % every === 0)
                    days.push({ userId: u.id, day: utcMidnight(d) });
        });

        await prisma.userActivityDay.createMany({ data: days });

        const access: {
            userId: string;
            ip: string;
            country: string;
            device: string;
            firstSeen: Date;
            lastSeen: Date;
            days: number;
        }[] = [];

        let cursor = 0;

        for (const g of SHARED_GROUPS)
            for (let k = 0; k < g.size && cursor < users.length; k += 1) {
                access.push({
                    userId: users[cursor].id,
                    ip: g.ip,
                    country: COUNTRIES[cursor % COUNTRIES.length],
                    device: DEVICES[cursor % DEVICES.length],
                    firstSeen: utcMidnight(20 + k),
                    lastSeen: utcMidnight(k),
                    days: 5 + k,
                });
                cursor += 1;
            }

        users.forEach((u, i) => {
            access.push({
                userId: u.id,
                ip: `198.51.100.${i + 1}`,
                country: COUNTRIES[i % COUNTRIES.length],
                device: DEVICES[i % DEVICES.length],
                firstSeen: utcMidnight(45),
                lastSeen: utcMidnight(i % 5),
                days: 10 + i,
            });
        });

        await prisma.userAccess.createMany({ data: access });

        await prisma.accountDeletion.createMany({
            data: [
                { by: 'self', accountAgeDays: 3, campaigns: 0 },
                { by: 'self', accountAgeDays: 40, campaigns: 2 },
                { by: 'admin', accountAgeDays: 12, campaigns: 1 },
            ].map((r, i) => ({ ...r, deletedAt: utcMidnight(i * 7 + 1) })),
        });

        const actions = ['ban', 'unban', 'signout', 'ban', 'delete'] as const;

        await prisma.adminAction.createMany({
            data: actions.map((action, i) => ({
                adminUserId: users[0].id,
                action,
                targetUserId: users[(i + 1) % users.length].id,
                at: new Date(Date.now() - i * DAY_MS),
                meta: action === 'ban' ? { duration: '24h' } : {},
            })),
        });

        console.log(
            `seeded ${users.length} users: ${days.length} activity days, ${access.length} access rows`
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
