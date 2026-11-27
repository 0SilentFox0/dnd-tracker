import 'server-only';
import { DAY_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';
import { hashEmail } from '@/lib/utils/admin/email-hash';
import { groupSharedIps } from '@/lib/utils/admin/shared-ip';
import type { AdminSecurity } from '@/types/admin';

const MAX_IPS = 200;

const MAX_NEW_USERS = 5000;

type AccessRow = {
    ip: string;
    userId: string;
    country: string | null;
    device: string | null;
    displayName: string;
    email: string;
};

async function sharedGroups(since: Date): Promise<AdminSecurity['groups']> {
    const access = await prisma.$queryRaw<AccessRow[]>`
        select a.ip, a."userId", a.country, a.device, u."displayName", u.email
        from user_access a
        join users u on u.id = a."userId"
        where a."lastSeen" > ${since} and a.ip in (
            select ip from user_access where "lastSeen" > ${since}
            group by ip having count(distinct "userId") >= 2
            order by count(distinct "userId") desc limit ${MAX_IPS})`;

    if (!access.length) return [];

    const ids = [...new Set(access.map((r) => r.userId))];

    const activity = await prisma.$queryRaw<{ userId: string; day: Date }[]>`
        select "userId", day from user_activity_days
        where "userId" = any(${ids}::text[]) and day >= ${since}::date`;

    const daysByUser = new Map<string, string[]>();

    for (const a of activity)
        daysByUser.set(a.userId, [
            ...(daysByUser.get(a.userId) ?? []),
            a.day.toISOString().slice(0, 10),
        ]);

    const names = new Map(access.map((r) => [r.userId, r]));

    return groupSharedIps(
        access.map((r) => ({
            ip: r.ip,
            userId: r.userId,
            country: r.country,
            device: r.device,
            days: daysByUser.get(r.userId) ?? [],
        }))
    ).map((g) => ({
        ...g,
        accounts: g.accounts.map((a) => ({
            ...a,
            displayName: names.get(a.userId)?.displayName ?? '',
            email: names.get(a.userId)?.email ?? '',
        })),
    }));
}

async function reRegistrations(): Promise<AdminSecurity['reRegistrations']> {
    const secret = process.env.ADMIN_HASH_SECRET;

    if (!secret) return [];

    const deletions = await prisma.accountDeletion.findMany({
        where: { emailHash: { not: null } },
        select: { emailHash: true, deletedAt: true },
    });

    if (!deletions.length) return [];

    const oldest = deletions.reduce(
        (m, d) => (d.deletedAt < m ? d.deletedAt : m),
        deletions[0].deletedAt
    );

    const users = await prisma.user.findMany({
        where: { createdAt: { gt: oldest } },
        select: { id: true, displayName: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: MAX_NEW_USERS,
    });

    const result: AdminSecurity['reRegistrations'] = [];

    for (const u of users) {
        const hash = hashEmail(u.email, secret);

        const hit = deletions.find(
            (d) => d.emailHash === hash && d.deletedAt < u.createdAt
        );

        if (hit)
            result.push({
                userId: u.id,
                displayName: u.displayName,
                email: u.email,
                createdAt: u.createdAt.toISOString(),
                deletedAt: hit.deletedAt.toISOString(),
            });
    }

    return result;
}

export async function buildSecurity(days: number): Promise<AdminSecurity> {
    const since = new Date(Date.now() - days * DAY_MS);

    const [groups, reRegs, since0, actions] = await Promise.all([
        sharedGroups(since),
        reRegistrations(),
        prisma.$queryRaw<{ since: string | null }[]>`
            select to_char(min("firstSeen"), 'YYYY-MM-DD') as since from user_access`,
        prisma.adminAction.findMany({ orderBy: { at: 'desc' }, take: 50 }),
    ]);

    return {
        days,
        dataSince: since0[0]?.since ?? null,
        hashConfigured: !!process.env.ADMIN_HASH_SECRET,
        groups,
        reRegistrations: reRegs,
        actions: actions.map((a) => ({
            at: a.at.toISOString(),
            action: a.action,
            adminUserId: a.adminUserId,
            targetUserId: a.targetUserId,
            meta: a.meta,
        })),
    };
}
