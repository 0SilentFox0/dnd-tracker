"use client";

import Link from "next/link";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import {
  AbilityBonusIcons,
  SkillStatsIcons,
} from "@/components/skills/icons/AbilityBonusIcons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getStatLabel,
  getTypeLabel,
  isFlagValueType,
} from "@/lib/constants/skill-effects";
import { getSimpleTriggerLabel } from "@/lib/constants/skill-triggers";
import {
  getSkillBonuses,
  getSkillCombatStats,
  getSkillDescription,
  getSkillEffects,
  getSkillIcon,
  getSkillId,
  getSkillName,
  getSkillSpell,
  getSkillTriggers,
} from "@/lib/utils/skills/skill-helpers";
import type { SkillEffect } from "@/types/battle";
import type { ComplexSkillTrigger, SkillTrigger } from "@/types/skill-triggers";
import type { GroupedSkill, Skill } from "@/types/skills";

export interface SkillCardProps {
  skill: Skill | GroupedSkill;
  campaignId: string;
}

function formatEffectValue(e: SkillEffect): string {
  if (isFlagValueType(e.type)) return "✓";

  if (e.type === "percent") return `${e.value}%`;

  return String(e.value);
}

function formatTrigger(t: SkillTrigger): string {
  if (t.type === "simple") {
    const label = getSimpleTriggerLabel(t.trigger);

    const mods: string[] = [];

    if (t.modifiers?.probability != null)
      mods.push(`${Math.round(t.modifiers.probability * 100)}%`);

    if (t.modifiers?.oncePerBattle) mods.push("1/бій");

    if (t.modifiers?.twicePerBattle) mods.push("2/бій");

    return mods.length > 0 ? `${label} (${mods.join(", ")})` : label;
  }

  const c = t as ComplexSkillTrigger;

  const pct = c.valueType === "percent" ? "%" : "";

  const targetLabel =
    c.target === "ally" ? "союзник" : c.target === "enemy" ? "ворог" : "герой";

  return `якщо ${targetLabel} ${c.operator} ${c.value}${pct} ${c.stat}`;
}

export function SkillCard({ skill, campaignId }: SkillCardProps) {
  const skillId = getSkillId(skill);

  const skillName = getSkillName(skill);

  const skillDescription = getSkillDescription(skill);

  const skillIcon = getSkillIcon(skill);

  const skillBonuses = getSkillBonuses(skill);

  const combatStats = getSkillCombatStats(skill);

  const skillSpell = getSkillSpell(skill);

  const effects = getSkillEffects(skill);

  const triggers = getSkillTriggers(skill);

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        {skillIcon && (
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
            <OptimizedImage
              src={skillIcon}
              alt={skillName}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-xl text-muted-foreground">
                    {skillName[0]?.toUpperCase() || "?"}
                  </span>
                </div>
              }
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-base flex-1 min-w-0 truncate">
              {skillName}
            </h3>
          </div>
        </div>
      </div>

      {skillDescription && (
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
          {skillDescription}
        </p>
      )}

      <div className="space-y-2 mb-3">
        {Object.keys(skillBonuses || {}).length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Бонуси:
            </span>
            <AbilityBonusIcons bonuses={skillBonuses} />
          </div>
        )}

        {(combatStats.armor ||
          combatStats.physicalResistance ||
          combatStats.magicalResistance) && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Захист:
            </span>
            <SkillStatsIcons
              armor={combatStats.armor}
              physicalResistance={combatStats.physicalResistance}
              magicalResistance={combatStats.magicalResistance}
            />
          </div>
        )}

        {(combatStats.damage || combatStats.speed) && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {combatStats.damage != null && (
              <div>Шкода: {combatStats.damage}</div>
            )}
            {combatStats.speed != null && (
              <div>Швидкість: {combatStats.speed}</div>
            )}
          </div>
        )}

        {effects.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Ефекти:
            </span>
            <div className="flex flex-wrap gap-1">
              {effects.map((e, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs"
                >
                  {getStatLabel(e.stat)}: {getTypeLabel(e.type)}{" "}
                  {formatEffectValue(e)}
                  {e.duration != null ? ` (${e.duration} р.)` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {triggers.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Тригери:
            </span>
            <div className="flex flex-wrap gap-1">
              {triggers.map((t, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs font-normal"
                >
                  {formatTrigger(t)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {skillSpell && (
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold">Покращення спела:</span>{" "}
            {skillSpell.name}
          </div>
        )}
      </div>

      <Link href={`/campaigns/${campaignId}/dm/skills/${skillId}`}>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs sm:text-sm"
        >
          Редагувати
        </Button>
      </Link>
    </div>
  );
}
