import 'server-only';
import { DAY_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';
import { findBlockingTemplates } from '@/lib/server/account/template-guard';
import { cloneWhere, systemKey } from '@/lib/server/admin/campaign-links';
import { getAdminUserRow } from '@/lib/server/admin/users-list';
import type { AdminUserDetail } from '@/types/admin';

const ACTIVITY_DAYS = 90;

const ACTIONS_LIMIT = 50;

export async function getAdminUserDetail(
    id: string
): Promise<AdminUserDetail | null> {
    const row = await getAdminUserRow(id);

    if (!row) return null;

    const since = new Date(Date.now() - ACTIVITY_DAYS * DAY_MS);

    const [profile, owned, memberships, activity, access, actions, blocking] =
        await Promise.all([
            prisma.user.findUnique({
                where: { id },
                select: { locale: true, timeZone: true },
            }),
            prisma.campaign.findMany({
                where: { dmUserId: id },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    kind: true,
                    rules: true,
                    contentVersion: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: { select: { members: true } },
                },
            }),
            prisma.campaignMember.findMany({
                where: { userId: id, campaign: { dmUserId: { not: id } } },
                select: {
                    campaign: {
                        select: {
                            id: true,
                            name: true,
                            dm: { select: { id: true, displayName: true } },
                        },
                    },
                },
            }),
            prisma.userActivityDay.findMany({
                where: { userId: id, day: { gte: since } },
                orderBy: { day: 'asc' },
                select: { day: true },
            }),
            prisma.userAccess.findMany({
                where: { userId: id },
                orderBy: { lastSeen: 'desc' },
            }),
            prisma.adminAction.findMany({
                where: { targetUserId: id },
                orderBy: { at: 'desc' },
                take: ACTIONS_LIMIT,
            }),
            findBlockingTemplates(id),
        ]);

    const templateRows = owned.filter((c) => c.kind === 'template');

    const clones = await Promise.all(
        templateRows.map((t) =>
            prisma.campaign.count({ where: cloneWhere([t.id]) })
        )
    );

    const ips = access.map((a) => a.ip);

    const others = ips.length
        ? await prisma.userAccess.findMany({
              where: { ip: { in: ips }, userId: { not: id } },
              select: {
                  ip: true,
                  user: {
                      select: { id: true, displayName: true, email: true },
                  },
              },
          })
        : [];

    return {
        user: {
            ...row,
            locale: profile?.locale ?? null,
            timeZone: profile?.timeZone ?? null,
        },
        owned: owned.map((c) => ({
            id: c.id,
            name: c.name,
            kind: c.kind,
            system: systemKey(c.rules),
            players: c._count.members,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        })),
        joined: memberships.map((m) => m.campaign),
        templates: templateRows.map((t, i) => ({
            id: t.id,
            name: t.name,
            versions: t.contentVersion,
            clones: clones[i],
            blocksDeletion: blocking.includes(t.id),
        })),
        activityDays: activity.map((a) => a.day.toISOString().slice(0, 10)),
        access: access.map((a) => ({
            ip: a.ip,
            country: a.country,
            device: a.device,
            firstSeen: a.firstSeen.toISOString(),
            lastSeen: a.lastSeen.toISOString(),
            days: a.days,
            otherAccounts: others
                .filter((o) => o.ip === a.ip)
                .map((o) => o.user),
        })),
        actions: actions.map((a) => ({
            at: a.at.toISOString(),
            action: a.action,
            adminUserId: a.adminUserId,
            meta: a.meta,
        })),
    };
}
