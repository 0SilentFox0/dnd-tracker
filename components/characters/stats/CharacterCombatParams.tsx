import { useTranslations } from "next-intl";

import { LabeledInput } from "@/components/ui/labeled-input";
import { clampHeroInitiative } from "@/lib/constants/characters";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import type { SheetTotal } from "@/types/characters";

const intOr = (v: string, fallback: number) => {
  const n = parseInt(v, 10);

  return Number.isNaN(n) ? fallback : n;
};

export function CharacterCombatParams({ campaignId, combatStats: { data, set }, classArmor }: { campaignId: string; combatStats: CharacterFormBindings["combatStats"]; classArmor?: SheetTotal | null }) {
  const t = useTranslations("characters.stats");

  const tc = useTranslations("common.stats");

  const { data: rules } = useCampaignRules(campaignId);

  const moraleRule = rules?.morale ?? { enabled: true, cap: 3 };

  const initiativeRange = rules?.initiative ?? { heroMin: 10, heroMax: 16 };

  const { armorClass, initiative, speed, minTargets, maxTargets, morale } = data;

  return (
    <div className="grid w-full grid-cols-3 items-end gap-2 sm:grid-cols-4">
      {classArmor === undefined ? (
        <LabeledInput id="armorClass" label={t("armorClass")} labelClassName="text-xs leading-tight" type="number" min="0" value={armorClass} onChange={(e) => set("armorClass", intOr(e.target.value, 10))} containerClassName="w-full min-w-0" className="w-full" />
      ) : (
        <div className="col-span-3 space-y-1 sm:col-span-4">
          <span className="text-xs leading-tight text-hud-muted">{t("armorClass")}</span>
          {classArmor === null ? (
            <p className="text-sm">{t("classArmorHint")}</p>
          ) : (
            <>
              <p className="text-lg font-bold">{classArmor.total}</p>
              <ul className="text-xs text-hud-muted">
                {classArmor.lines.map((l) => (
                  <li key={`${l.label}-${l.value}`}>{`${l.label} ${l.value}`}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <LabeledInput id="initiative" label={tc("initiative")} labelClassName="text-xs leading-tight" type="number" min={initiativeRange.heroMin} max={initiativeRange.heroMax} value={initiative} onChange={(e) => set("initiative", parseInt(e.target.value) || 0)} onBlur={() => set("initiative", clampHeroInitiative(initiative, initiativeRange))} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="speed" label={tc("speed")} labelClassName="text-xs leading-tight" type="number" min="0" value={speed} onChange={(e) => set("speed", intOr(e.target.value, 30))} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="minTargets" label={t("minTargets")} labelClassName="text-xs leading-tight" type="number" min="1" value={minTargets} onChange={(e) => set("minTargets", parseInt(e.target.value) || 1)} containerClassName="w-full min-w-0" className="w-full" />
      <LabeledInput id="maxTargets" label={t("maxTargets")} labelClassName="text-xs leading-tight" type="number" min="1" value={maxTargets} onChange={(e) => set("maxTargets", parseInt(e.target.value) || 1)} containerClassName="w-full min-w-0" className="w-full" />
      {moraleRule.enabled && <LabeledInput id="morale" label={tc("moral")} labelClassName="text-xs leading-tight" type="number" min={-moraleRule.cap} max={moraleRule.cap} value={morale} onChange={(e) => set("morale", parseInt(e.target.value) || 0)} containerClassName="w-full min-w-0" className="w-full" />}
    </div>
  );
}
