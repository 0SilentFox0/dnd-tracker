import 'server-only';
import { prisma } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export class AdminAuthUnavailableError extends Error {
    constructor() {
        super('ADMIN_AUTH_UNAVAILABLE');
        this.name = 'AdminAuthUnavailableError';
    }
}

type AuthAdminClient = Pick<
    ReturnType<typeof createAdminClient>['auth']['admin'],
    'updateUserById'
>;

type Deps = { client?: { auth: { admin: AuthAdminClient } } };

function resolveClient(deps: Deps) {
    if (deps.client) return deps.client;

    try {
        return createAdminClient();
    } catch {
        throw new AdminAuthUnavailableError();
    }
}

async function setBanDuration(id: string, duration: string, deps: Deps) {
    const { error } = await resolveClient(deps).auth.admin.updateUserById(id, {
        ban_duration: duration,
    });

    if (error) throw new AdminAuthUnavailableError();
}

export async function signOutUser(id: string): Promise<void> {
    const rows = await prisma.$queryRaw<{ ok: boolean }[]>`
        select to_regclass('auth.sessions') is not null as ok`;

    if (rows[0]?.ok !== true) return;

    await prisma.$executeRaw`DELETE FROM auth.sessions WHERE user_id = ${id}::uuid`;
}

export async function banUser(
    id: string,
    hours: 24 | 168 | 876000,
    deps: Deps = {}
): Promise<void> {
    await setBanDuration(id, `${hours}h`, deps);
    await signOutUser(id);
}

export async function unbanUser(id: string, deps: Deps = {}): Promise<void> {
    await setBanDuration(id, 'none', deps);
}
