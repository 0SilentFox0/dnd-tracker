import { campaignGet } from "@/lib/api/client";
import type { OwnerKind } from "@/lib/utils/abilities/legacy/read";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { AbilitySourceRef } from "@/types/abilities";

export const getAbilitySources = (campaignId: string) => campaignGet<{ sources: AbilitySourceRef[] }>(campaignId, "/abilities/sources");

export const getOwnerAbilities = (campaignId: string, kind: OwnerKind, ownerId: string) =>
  campaignGet<{ abilities: Ability[] }>(campaignId, `/abilities/${kind}/${ownerId}`);
