import { restParty } from "@/lib/server/characters/core/rest-handler";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import type { TravelRest } from "@/types/world";

export async function applyWorldRest(access: CampaignAccessResult, kind: TravelRest, characterIds: string[]): Promise<{ applied: boolean }> {
  if (kind === "none" || !access.campaign.rules.outOfCombat.persistResources) return { applied: false };

  await restParty(access, { kind, characterIds });

  return { applied: true };
}
