"use client";

import { useMemo } from "react";

import { useCampaignRules } from "@/lib/hooks/campaigns";
import { allowedEffectKinds } from "@/lib/utils/abilities/editor";
import { FORMULA_VARIABLES } from "@/lib/utils/abilities/engine/core/amount";
import { variableNamesOf } from "@/lib/utils/abilities/engine/core/variables";
import { FLAG_KEYS } from "@/lib/utils/abilities/registry/effects/flags";
import { isEffectInComposition } from "@/lib/utils/abilities/registry/effects/ownership";
import { SYSTEM_EFFECT_OWNERSHIP } from "@/lib/utils/abilities/registry/effects/system-rows";
import type { EffectKind, FlagKey, Trigger } from "@/lib/utils/abilities/schema";
import { type Composition, composition } from "@/lib/utils/rules/systems/catalog";

/** Editor pickers limited to the campaign composition; without a campaign (or before rules load) everything is offered. */
export function useAbilityComposition(campaignId: string) {
  const system = useCampaignRules(campaignId).data?.system;

  return useMemo(() => {
    const c: Composition | null = system ? composition(system) : null;

    const inside = (e: { kind: string; flag?: string }) => !c || isEffectInComposition(e, c, SYSTEM_EFFECT_OWNERSHIP);

    return {
      composition: c,
      kinds: (trigger: Trigger): EffectKind[] => allowedEffectKinds(trigger).filter((kind) => inside({ kind })),
      flags: FLAG_KEYS.filter((flag) => inside({ kind: "flag", flag })) as FlagKey[],
      variables: c ? variableNamesOf(c) : [...FORMULA_VARIABLES],
    };
  }, [system]);
}
