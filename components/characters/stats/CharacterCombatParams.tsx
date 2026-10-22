import { LabeledInput } from "@/components/ui/labeled-input";
import { clampHeroInitiative, HERO_INITIATIVE } from "@/lib/constants/characters";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";

const intOr = (v: string, fallback: number) => {
  const n = parseInt(v, 10);

  return Number.isNaN(n) ? fallback : n;
};

export function CharacterCombatParams({ combatStats: { data, set } }: { combatStats: CharacterFormBindings["combatStats"] }) {
  const { armorClass, initiative, speed, minTargets, maxTargets, morale } = data;

  return (
    <div className="grid w-full grid-cols-3 items-end gap-2 sm:grid-cols-4">
      <LabeledInput id="armorClass" label="Клас Броні (AC)" labelClassName="text-xs leading-tight" type="number" min="0" value={armorClass} onChange={(e) => set("armorClass", intOr(e.target.value, 10))} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="initiative" label="Ініціатива" labelClassName="text-xs leading-tight" type="number" min={HERO_INITIATIVE.MIN} max={HERO_INITIATIVE.MAX} value={initiative} onChange={(e) => set("initiative", parseInt(e.target.value) || 0)} onBlur={() => set("initiative", clampHeroInitiative(initiative))} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="speed" label="Швидкість" labelClassName="text-xs leading-tight" type="number" min="0" value={speed} onChange={(e) => set("speed", intOr(e.target.value, 30))} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="minTargets" label="Мін. цілей" labelClassName="text-xs leading-tight" type="number" min="1" value={minTargets} onChange={(e) => set("minTargets", parseInt(e.target.value) || 1)} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="maxTargets" label="Макс. цілей" labelClassName="text-xs leading-tight" type="number" min="1" value={maxTargets} onChange={(e) => set("maxTargets", parseInt(e.target.value) || 1)} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="morale" label="Мораль" labelClassName="text-xs leading-tight" type="number" min="-3" max="3" value={morale} onChange={(e) => set("morale", parseInt(e.target.value) || 0)} containerClassName="w-full min-w-0" className="w-full" />
    </div>
  );
}
