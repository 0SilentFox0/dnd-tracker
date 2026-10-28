import { type DraftClassResult, type ParsedDraft, resolveDraftClass } from "./draft-class";

import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import type { Ruleset } from "@/lib/utils/rules/schema";

type DraftCampaign = { id: string; maxLevel: number; rules: Ruleset };

export async function resolveDraftParts({ data, asClass }: ParsedDraft, campaign: DraftCampaign) {
  const [avatar, classResult] = await Promise.all([
    resolveAvatarForPersistence(data.avatar, { campaignId: campaign.id }),
    asClass ? resolveDraftClass({ campaignId: campaign.id, rules: campaign.rules, maxLevel: campaign.maxLevel, classId: asClass.classId, classesById: asClass.classesById }) : null,
  ]);

  return { avatar, asClass: classResult satisfies DraftClassResult | null };
}
