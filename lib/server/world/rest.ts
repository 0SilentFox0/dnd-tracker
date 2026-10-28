import { restParty } from "@/lib/server/characters/core/rest-handler";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";

export async function applyWorldRest(access: CampaignAccessResult, kind: "short" | "long", characterIds: string[]): Promise<{ applied: boolean }> {
  if (!access.campaign.rules.outOfCombat.persistResources) return { applied: false };

  await restParty(access, { kind, characterIds });

  return { applied: true };
}
