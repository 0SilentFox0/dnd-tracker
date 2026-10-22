import "server-only";
import { prisma } from "@/lib/db";
import { CHECKLIST_HIDDEN, checklistKey } from "@/lib/onboarding/flag-keys";
import { checklistProgress, checklistState } from "@/lib/onboarding/progress";
import { readOnboardingFacts } from "@/lib/server/onboarding/facts";
import { readFlagMap } from "@/lib/server/onboarding/flags";
import type { CampaignOnboardingResponse } from "@/types/onboarding";

const HIDDEN: Omit<CampaignOnboardingResponse, "role"> = { state: "hidden", steps: [], requiredDone: 0, requiredTotal: 0 };

/** Caller has already checked campaign membership. */
export async function readCampaignOnboarding(campaignId: string, userId: string, isDM: boolean): Promise<CampaignOnboardingResponse> {
  const role = isDM ? "dm" : "player";

  const flags = await readFlagMap(userId);

  const key = checklistKey(campaignId);

  const now = new Date();

  // прихований чекліст (вручну або через 7 днів після виконання) не потребує фактів — 11 підзапитів економляться для більшості візитів
  if (flags[key] === CHECKLIST_HIDDEN || (flags[key] && checklistState(flags[key], true, now) === "hidden")) return { role, ...HIDDEN };

  const facts = await readOnboardingFacts(campaignId, userId, isDM, flags);

  const progress = checklistProgress(facts, campaignId);

  let flag = flags[key];

  if (progress.allRequiredDone && flag === undefined) {
    flag = now.toISOString();
    // skipDuplicates: паралельний запит уже міг поставити дату — тоді лишаємо його
    await prisma.userOnboardingFlag.createMany({ data: { userId, key, value: flag }, skipDuplicates: true });
  }

  return {
    role,
    state: checklistState(flag, progress.allRequiredDone, now),
    steps: progress.steps,
    requiredDone: progress.requiredDone,
    requiredTotal: progress.requiredTotal,
  };
}
