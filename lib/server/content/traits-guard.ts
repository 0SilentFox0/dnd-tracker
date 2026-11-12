import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import { type EffectOwnership, isEffectInComposition } from "@/lib/utils/abilities/registry/effects/ownership";
import { SYSTEM_EFFECT_OWNERSHIP } from "@/lib/utils/abilities/registry/effects/system-rows";
import { parseRules } from "@/lib/utils/rules/schema";
import { composition, type SystemSelection } from "@/lib/utils/rules/systems/catalog";

interface EffectNode {
  kind: string;
  flag?: unknown;
  options?: readonly EffectNode[];
}

type EffectOwner = { effects: readonly EffectNode[] };

const flatten = (effects: readonly EffectNode[]): EffectNode[] => effects.flatMap((e) => [e, ...(Array.isArray(e.options) ? flatten(e.options) : [])]);

export function assertEffectsInComposition(system: SystemSelection, abilities: readonly EffectOwner[] | undefined, own: EffectOwnership = SYSTEM_EFFECT_OWNERSHIP): void {
  if (!abilities?.length) return;

  const c = composition(system);

  if (abilities.some((a) => flatten(a.effects).some((e) => !isEffectInComposition(e, c, own)))) throw new ContentError(API_ERRORS.EFFECT_OUTSIDE_COMPOSITION, 422);
}

/** Resource writes outside units: the rule system comes from the campaign the row is written to. */
export async function assertCampaignEffects(campaignId: string, abilities: readonly EffectOwner[] | undefined): Promise<void> {
  if (!abilities?.length) return;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

  assertEffectsInComposition(parseRules(campaign?.rules ?? null).system, abilities);
}
