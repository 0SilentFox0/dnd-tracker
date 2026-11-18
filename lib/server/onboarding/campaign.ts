import 'server-only';
import { prisma } from '@/lib/db';
import { checklistKey } from '@/lib/onboarding/flag-keys';
import { checklistProgress, checklistState } from '@/lib/onboarding/progress';
import { readOnboardingSnapshot } from '@/lib/server/onboarding/facts';
import type { CampaignOnboardingResponse } from '@/types/onboarding';

/** Caller has already checked campaign membership. */
export async function readCampaignOnboarding(
    campaignId: string,
    userId: string,
    isDM: boolean
): Promise<CampaignOnboardingResponse> {
    const { facts, checklistFlag } = await readOnboardingSnapshot(
        campaignId,
        userId,
        isDM
    );

    const progress = checklistProgress(facts, campaignId);

    const now = new Date();

    let flag = checklistFlag ?? undefined;

    if (progress.allRequiredDone && flag === undefined) {
        flag = now.toISOString();
        // skipDuplicates: a parallel request may already have set the date, then keep it
        await prisma.userOnboardingFlag.createMany({
            data: { userId, key: checklistKey(campaignId), value: flag },
            skipDuplicates: true,
        });
    }

    return {
        role: facts.role,
        state: checklistState(flag, progress.allRequiredDone, now),
        steps: progress.steps,
        requiredDone: progress.requiredDone,
        requiredTotal: progress.requiredTotal,
    };
}
