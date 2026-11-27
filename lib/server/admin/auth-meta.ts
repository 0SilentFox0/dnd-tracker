import 'server-only';
import { prisma } from '@/lib/db';

export type AuthMeta = {
    bannedUntil: string | null;
    lastSignInAt: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let schemaPresent: boolean | undefined;

const errorName = (e: unknown) => (e instanceof Error ? e.name : 'unknown');

const iso = (d: Date | string | null) =>
    d === null ? null : new Date(d).toISOString();

export async function hasAuthSchema(): Promise<boolean> {
    if (schemaPresent !== undefined) return schemaPresent;

    try {
        const rows = await prisma.$queryRaw<{ ok: boolean }[]>`
            select to_regclass('auth.users') is not null as ok`;

        schemaPresent = rows[0]?.ok === true;
    } catch (e) {
        console.warn('[admin] auth schema probe failed', errorName(e));

        return false;
    }

    return schemaPresent;
}

export async function readAuthMeta(
    ids: string[]
): Promise<Map<string, AuthMeta>> {
    const result = new Map<string, AuthMeta>();

    const uuids = ids.filter((id) => UUID.test(id));

    if (!uuids.length || !(await hasAuthSchema())) return result;

    try {
        const rows = await prisma.$queryRaw<
            {
                id: string;
                banned_until: Date | null;
                last_sign_in_at: Date | null;
            }[]
        >`
            select id::text, banned_until, last_sign_in_at
            from auth.users where id = any(${uuids}::uuid[])`;

        for (const r of rows)
            result.set(r.id, {
                bannedUntil: iso(r.banned_until),
                lastSignInAt: iso(r.last_sign_in_at),
            });
    } catch (e) {
        console.warn('[admin] auth meta read failed', errorName(e));
    }

    return result;
}

export async function readBannedIds(): Promise<string[]> {
    if (!(await hasAuthSchema())) return [];

    try {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
            select id::text from auth.users where banned_until > now()`;

        return rows.map((r) => r.id);
    } catch (e) {
        console.warn('[admin] banned list read failed', errorName(e));

        return [];
    }
}
