import { LabeledInput } from "@/components/ui/labeled-input";
import { clampHeroInitiative } from "@/lib/constants/characters";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";

export function CharacterCombatParams({ campaignId, combatStats: { data, set } }: { campaignId: string; combatStats: CharacterFormBindings["combatStats"] }) {
  const { data: rules } = useCampaignRules(campaignId);

  const moraleRule = rules?.morale ?? { enabled: true, cap: 3 };

  const initiativeRange = rules?.initiative ?? { heroMin: 10, heroMax: 16 };

  const { armorClass, initiative, speed, minTargets, maxTargets, morale } = data;

  return (
    <div className="grid w-full grid-cols-3 items-end gap-2 sm:grid-cols-4">
      <LabeledInput id="armorClass" label="Клас Броні (AC)" labelClassName="text-xs leading-tight" type="number" min="0" value={armorClass} onChange={(e) => set("armorClass", parseInt(e.target.value) || 10)} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="initiative" label="Ініціатива" labelClassName="text-xs leading-tight" type="number" min={initiativeRange.heroMin} max={initiativeRange.heroMax} value={initiative} onChange={(e) => set("initiative", parseInt(e.target.value) || 0)} onBlur={() => set("initiative", clampHeroInitiative(initiative, initiativeRange))} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="speed" label="Швидкість" labelClassName="text-xs leading-tight" type="number" min="0" value={speed} onChange={(e) => set("speed", parseInt(e.target.value) || 30)} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="minTargets" label="Мін. цілей" labelClassName="text-xs leading-tight" type="number" min="1" value={minTargets} onChange={(e) => set("minTargets", parseInt(e.target.value) || 1)} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="maxTargets" label="Макс. цілей" labelClassName="text-xs leading-tight" type="number" min="1" value={maxTargets} onChange={(e) => set("maxTargets", parseInt(e.target.value) || 1)} containerClassName="w-full min-w-0" className="w-full" />
      {moraleRule.enabled && <LabeledInput id="morale" label="Мораль" labelClassName="text-xs leading-tight" type="number" min={-moraleRule.cap} max={moraleRule.cap} value={morale} onChange={(e) => set("morale", parseInt(e.target.value) || 0)} containerClassName="w-full min-w-0" className="w-full" />}
    </div>
  );
}
