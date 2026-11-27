import { Prisma } from '@prisma/client';

import 'server-only';
import { DAY_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';
import {
    COHORT_WEEKS_AFTER,
    cohortRetention,
    weekStart,
} from '@/lib/utils/admin/cohorts';
import {
    addDays,
    type DayCount,
    dayRange,
    delta,
    fillDays,
    rollingDistinct,
    toDay,
} from '@/lib/utils/admin/series';
import type { AdminOverview, AdminRange, Row, Tile } from '@/types/admin';

const RANGE_DAYS: Record<AdminRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
};

const COHORT_WEEKS = 12;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const daily = (source: Prisma.Sql) =>
    prisma.$queryRaw<DayCount[]>`
        select to_char(d, 'YYYY-MM-DD') as day, count(*)::int as n
        from (${source}) t group by d`;

const dayOf = (table: string, column: string, from: string, where = '') =>
    Prisma.sql`select (${Prisma.raw(`"${column}"`)})::date as d
        from ${Prisma.raw(table)}
        where ${Prisma.raw(`"${column}"`)} >= ${from}::date ${Prisma.raw(where)}`;

const tile = (rows: DayCount[], days: string[], range: number): Tile => {
    const all = fillDays(rows, addDays(days[0], -range), days[days.length - 1]);

    const value = sum(all.slice(range));

    return { value, delta: delta(value, sum(all.slice(0, range))) };
};

const rows = (r: { key: string | null; n: number }[]): Row[] =>
    r.map((x) => ({ key: x.key ?? 'none', n: x.n }));

export async function buildOverview(
    range: AdminRange,
    now = new Date()
): Promise<AdminOverview> {
    const size = RANGE_DAYS[range];

    const today = toDay(now.getTime());

    const days = dayRange(addDays(today, -(size - 1)), today);

    const periodStart = days[0];

    const windowFrom = addDays(periodStart, -size);

    const cohortFrom = addDays(weekStart(today), -7 * (COHORT_WEEKS - 1));

    const activityFrom = [addDays(periodStart, -29), cohortFrom].sort()[0];

    const [
        signups,
        deletions,
        campaigns,
        battles,
        characters,
        activity,
        usersTotal,
        campaignsTotal,
        templatesTotal,
        withAiKey,
        activated,
        cohortSignups,
        locale,
        system,
        country,
        since,
    ] = await Promise.all([
        daily(dayOf('users', 'createdAt', windowFrom)),
        daily(dayOf('account_deletions', 'deletedAt', windowFrom)),
        daily(
            dayOf('campaigns', 'createdAt', windowFrom, `and kind = 'campaign'`)
        ),
        daily(dayOf('battle_scenes', 'createdAt', windowFrom)),
        daily(dayOf('characters', 'createdAt', windowFrom)),
        prisma.$queryRaw<{ userId: string; day: string }[]>`
            select "userId", to_char(day, 'YYYY-MM-DD') as day
            from user_activity_days where day >= ${activityFrom}::date`,
        prisma.user.count(),
        prisma.campaign.count({ where: { kind: 'campaign' } }),
        prisma.campaign.count({ where: { kind: 'template' } }),
        prisma.$queryRaw<{ n: number }[]>`
            select count(distinct "userId")::int as n from ai_credentials`,
        prisma.$queryRaw<{ n: number }[]>`
            select count(*)::int as n from users u
            where u."createdAt" >= ${periodStart}::date
              and (
                exists (select 1 from campaigns c where c."dmUserId" = u.id
                    and c."createdAt" <= u."createdAt" + interval '7 days')
                or exists (select 1 from campaign_members m where m."userId" = u.id
                    and m."joinedAt" <= u."createdAt" + interval '7 days')
              )`,
        prisma.$queryRaw<{ userId: string; createdAt: string }[]>`
            select id as "userId", to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
            from users where "createdAt" >= ${cohortFrom}::date`,
        prisma.$queryRaw<{ key: string | null; n: number }[]>`
            select coalesce(locale, 'none') as key, count(*)::int as n
            from users group by 1 order by n desc`,
        prisma.$queryRaw<{ key: string | null; n: number }[]>`
            select coalesce(rules->'system'->>'key', 'none') as key, count(*)::int as n
            from campaigns where kind = 'campaign' group by 1 order by n desc`,
        prisma.$queryRaw<{ key: string | null; n: number }[]>`
            select coalesce(country, 'none') as key, count(distinct "userId")::int as n
            from user_access
            where "lastSeen" >= ${new Date(now.getTime() - 30 * DAY_MS)}
            group by 1 order by n desc`,
        prisma.$queryRaw<{ since: string | null }[]>`
            select to_char(min(day), 'YYYY-MM-DD') as since from user_activity_days`,
    ]);

    const signupSeries = fillDays(signups, periodStart, today);

    const deletionSeries = fillDays(deletions, periodStart, today);

    // Total users at end of each day: now, minus later signups, plus later deletions.
    const totalSeries = days.map((_, i) => {
        const laterSignups = sum(signupSeries.slice(i + 1));

        const laterDeletions = sum(deletionSeries.slice(i + 1));

        return usersTotal - laterSignups + laterDeletions;
    });

    const dau = rollingDistinct(activity, days, 1);

    const wau = rollingDistinct(activity, days, 7);

    const mau = rollingDistinct(activity, days, 30);

    const usersNew = tile(signups, days, size);

    const usersDeleted = tile(deletions, days, size);

    const last = days.length - 1;

    const activationRate =
        usersNew.value === 0 ? null : (activated[0]?.n ?? 0) / usersNew.value;

    return {
        range,
        dataSince: since[0]?.since ?? null,
        tiles: {
            usersTotal,
            usersNew,
            usersDeleted,
            netGrowth: usersNew.value - usersDeleted.value,
            dau: dau[last],
            wau: wau[last],
            mau: mau[last],
            stickiness: mau[last] === 0 ? null : dau[last] / mau[last],
            campaignsTotal,
            campaignsNew: tile(campaigns, days, size),
            templatesTotal,
            battles: tile(battles, days, size),
            withAiKey: withAiKey[0]?.n ?? 0,
            activationRate,
        },
        series: {
            days,
            signups: signupSeries,
            deletions: deletionSeries,
            usersTotal: totalSeries,
            dau,
            wau,
            mau,
            campaigns: fillDays(campaigns, periodStart, today),
            battles: fillDays(battles, periodStart, today),
            characters: fillDays(characters, periodStart, today),
        },
        cohorts: cohortRetention(
            cohortSignups,
            activity,
            COHORT_WEEKS_AFTER,
            today
        ),
        breakdowns: {
            locale: rows(locale),
            system: rows(system),
            country: rows(country),
        },
    };
}
