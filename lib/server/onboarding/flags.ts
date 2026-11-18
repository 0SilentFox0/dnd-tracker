import 'server-only';
import { prisma } from '@/lib/db';
import { WHATS_NEW_KEY } from '@/lib/onboarding/flag-keys';
import type { OnboardingFlags, OnboardingRole } from '@/lib/onboarding/types';
import { WHATS_NEW } from '@/lib/onboarding/whats-new';
import type { OnboardingFlagsResponse, ResetScope } from '@/types/onboarding';

async function readFlagMap(userId: string): Promise<OnboardingFlags> {
    const rows = await prisma.userOnboardingFlag.findMany({
        where: { userId },
        select: { key: true, value: true },
    });

    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setOnboardingFlag(
    userId: string,
    key: string,
    value: string | null
): Promise<void> {
    await prisma.userOnboardingFlag.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, value },
        update: { value },
    });
}

export async function readOnboardingFlags(
    userId: string
): Promise<OnboardingFlagsResponse> {
    const [flags, roles] = await Promise.all([
        readFlagMap(userId),
        prisma.campaignMember.findMany({
            where: { userId },
            select: { role: true },
            distinct: ['role'],
        }),
    ]);

    // first visit: old news must not light the badge
    if (!(WHATS_NEW_KEY in flags) && WHATS_NEW[0]) {
        // best-effort: without a users row (session older than the DB) the write fails, but the response must stay 200
        await setOnboardingFlag(userId, WHATS_NEW_KEY, WHATS_NEW[0].id).catch(
            () => undefined
        );
        flags[WHATS_NEW_KEY] = WHATS_NEW[0].id;
    }

    return { flags, audiences: roles.map((r) => r.role as OnboardingRole) };
}

export async function resetOnboardingFlags(
    userId: string,
    scope: ResetScope
): Promise<void> {
    await prisma.userOnboardingFlag.deleteMany({
        where: {
            userId,
            key: { startsWith: scope === 'hints' ? 'hint:' : 'checklist:' },
        },
    });
}
