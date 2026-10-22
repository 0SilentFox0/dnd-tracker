import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { checklistKey } from "@/lib/onboarding/flag-keys";
import { checklistProgress, checklistState } from "@/lib/onboarding/progress";
import { readOnboardingFacts } from "@/lib/server/onboarding/facts";
import { readFlagMap } from "@/lib/server/onboarding/flags";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import type { CampaignOnboardingResponse } from "@/types/onboarding";

export async function readCampaignOnboarding({ id, known }: { id: string; known?: { userId: string; isDM: boolean } }): Promise<NextResponse> {
  let who = known;

  if (!who) {
    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    who = { userId: access.userId, isDM: access.isDM };
  }

  const flags = await readFlagMap(who.userId);

  const facts = await readOnboardingFacts(id, who.userId, who.isDM, new Set(Object.keys(flags)));

  const progress = checklistProgress(facts, id);

  const key = checklistKey(id);

  let flag = flags[key];

  if (progress.allRequiredDone && flag === undefined) {
    flag = new Date().toISOString();
    // create, а не upsert: паралельний запит уже міг поставити дату — тоді лишаємо його
    await prisma.userOnboardingFlag.create({ data: { userId: who.userId, key, value: flag } }).catch(() => undefined);
  }

  const body: CampaignOnboardingResponse = {
    role: facts.role,
    state: checklistState(flag, progress.allRequiredDone, new Date()),
    steps: progress.steps,
    requiredDone: progress.requiredDone,
    requiredTotal: progress.requiredTotal,
  };

  return NextResponse.json(body, { headers: PRIVATE_NO_STORE_HEADERS });
}
