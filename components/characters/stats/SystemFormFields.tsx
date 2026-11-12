"use client";

import { systemUiOf } from "@/components/systems";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";

export function SystemFormFields({ campaignId, combatStats }: { campaignId: string; combatStats: CharacterFormBindings["combatStats"] }) {
  const { data: rules } = useCampaignRules(campaignId);

  if (!rules) return null;

  const fields = systemUiOf(rules.system.key, rules.system.modules).forms?.fields;

  return fields?.map((Field, i) => <Field key={i} combatStats={combatStats} rules={rules} />);
}
