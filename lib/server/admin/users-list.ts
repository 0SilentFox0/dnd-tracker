import { Prisma } from '@prisma/client';
import type { z } from 'zod';

import 'server-only';
import { DAY_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';
import type { adminUsersQuerySchema } from '@/lib/schemas/admin';
import {
    hasAuthSchema,
    readAuthMeta,
    readBannedIds,
} from '@/lib/server/admin/auth-meta';
import type { AdminUserRow, AdminUsersPage } from '@/types/admin';

type Query = z.input<typeof adminUsersQuerySchema>;

type Raw = {
    id: string;
    email: string;
    displayName: string;
    avatar: string | null;
    createdAt: Date;
    lastActiveAt: Date | null;
    campaignsDm: number;
    templates: number;
    memberships: number;
    characters: number;
    country: string | null;
    sharedIp: boolean;
};

const PAGE_SIZE = 50;

const SORTS = {
    created: { column: 'createdAt', cast: 'timestamp', nullable: false },
    active: { column: 'lastActiveAt', cast: 'date', nullable: true },
    campaigns: { column: 'campaignsDm', cast: 'int', nullable: false },
} as const;

type Cursor = { v: string | number | null; id: string };

const encodeCursor = (c: Cursor) =>
    Buffer.from(JSON.stringify(c)).toString('base64url');

const decodeCursor = (raw: string | undefined): Cursor | null => {
    if (!raw) return null;

    try {
        const c = JSON.parse(Buffer.from(raw, 'base64url').toString());

        return typeof c?.id === 'string' &&
            (c.v === null || ['string', 'number'].includes(typeof c.v))
            ? c
            : null;
    } catch {
        return null;
    }
};

const sortValue = (
    sort: keyof typeof SORTS,
    r: Raw
): string | number | null => {
    if (sort === 'campaigns') return r.campaignsDm;

    const d = sort === 'created' ? r.createdAt : r.lastActiveAt;

    return d ? d.toISOString() : null;
};

const filterSql = async (filter: string): Promise<Prisma.Sql | null> => {
    switch (filter) {
        case 'banned': {
            const ids = await readBannedIds();

            return ids.length ? Prisma.sql`x.id = any(${ids}::text[])` : null;
        }
        case 'sharedIp':
            return Prisma.sql`x."sharedIp"`;
        case 'inactive':
            return Prisma.sql`(x."lastActiveAt" is null
                or x."lastActiveAt" < ${new Date(Date.now() - 30 * DAY_MS)}::date)`;
        case 'noCampaigns':
            return Prisma.sql`x."campaignsDm" = 0 and x.memberships = 0`;
        case 'aiKey':
            return Prisma.sql`exists (select 1 from ai_credentials ac where ac."userId" = x.id)`;
        default:
            return Prisma.sql`true`;
    }
};

const cursorSql = (sort: keyof typeof SORTS, c: Cursor): Prisma.Sql => {
    const { column, cast, nullable } = SORTS[sort];

    const col = Prisma.raw(`x."${column}"`);

    if (c.v === null) return Prisma.sql`(${col} is null and x.id < ${c.id})`;

    const v = Prisma.sql`${c.v}::${Prisma.raw(cast)}`;

    return Prisma.sql`(${col} < ${v} or (${col} = ${v} and x.id < ${c.id})${
        nullable ? Prisma.sql` or ${col} is null` : Prisma.empty
    })`;
};

export async function listAdminUsers(query: Query): Promise<AdminUsersPage> {
    const sort = query.sort ?? 'created';

    const authMetaAvailable = await hasAuthSchema();

    const filter = await filterSql(query.filter ?? 'all');

    if (!filter) return { rows: [], next: null, authMetaAvailable };

    const q = query.q?.trim();

    const search = q
        ? Prisma.sql`and (x.email ilike ${`%${q}%`} or x."displayName" ilike ${`%${q}%`} or x.id = ${q})`
        : Prisma.empty;

    const cursor = decodeCursor(query.cursor);

    const after = cursor
        ? Prisma.sql`and ${cursorSql(sort, cursor)}`
        : Prisma.empty;

    const { column, nullable } = SORTS[sort];

    const order = Prisma.raw(
        `x."${column}" desc${nullable ? ' nulls last' : ''}, x.id desc`
    );

    const raw = await prisma.$queryRaw<Raw[]>`
        with camp as (
            select "dmUserId" as uid,
                count(*) filter (where kind = 'campaign')::int as "campaignsDm",
                count(*) filter (where kind = 'template')::int as templates
            from campaigns group by 1
        ), mem as (
            select "userId" as uid, count(*)::int as memberships
            from campaign_members group by 1
        ), chars as (
            select "controlledBy" as uid, count(*)::int as characters
            from characters group by 1
        ), act as (
            select "userId" as uid, max(day) as day
            from user_activity_days group by 1
        )
        select x.* from (
            select u.id, u.email, u."displayName", u.avatar, u."createdAt",
                act.day as "lastActiveAt",
                coalesce(camp."campaignsDm", 0) as "campaignsDm",
                coalesce(camp.templates, 0) as templates,
                coalesce(mem.memberships, 0) as memberships,
                coalesce(chars.characters, 0) as characters,
                (select a.country from user_access a where a."userId" = u.id
                    order by a."lastSeen" desc limit 1) as country,
                exists (
                    select 1 from user_access a
                    where a."userId" = u.id and exists (
                        select 1 from user_access a2
                        where a2.ip = a.ip and a2."userId" <> u.id
                            and a2."lastSeen" > now() - interval '30 days')
                ) as "sharedIp"
            from users u
            left join camp on camp.uid = u.id
            left join mem on mem.uid = u.id
            left join chars on chars.uid = u.id
            left join act on act.uid = u.id
        ) x
        where ${filter} ${search} ${after}
        order by ${order}
        limit ${PAGE_SIZE + 1}`;

    const page = raw.slice(0, PAGE_SIZE);

    const last = page[page.length - 1];

    const next =
        raw.length > PAGE_SIZE && last
            ? encodeCursor({ v: sortValue(sort, last), id: last.id })
            : null;

    const meta = await readAuthMeta(page.map((r) => r.id));

    const rows: AdminUserRow[] = page.map((r) => ({
        id: r.id,
        email: r.email,
        displayName: r.displayName,
        avatar: r.avatar,
        createdAt: r.createdAt.toISOString(),
        lastActiveAt: r.lastActiveAt
            ? r.lastActiveAt.toISOString().slice(0, 10)
            : null,
        lastSignInAt: meta.get(r.id)?.lastSignInAt ?? null,
        bannedUntil: meta.get(r.id)?.bannedUntil ?? null,
        campaignsDm: r.campaignsDm,
        templates: r.templates,
        memberships: r.memberships,
        characters: r.characters,
        country: r.country,
        sharedIp: r.sharedIp,
        subscription: null,
    }));

    return { rows, next, authMetaAvailable };
}
