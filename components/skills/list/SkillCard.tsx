"use client";

import { useState } from "react";
import Link from "next/link";

import { SkillCardActionsMenu } from "./SkillCardActionsMenu";
import { SkillCardDeleteDialog } from "./SkillCardDeleteDialog";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import {
  AbilityBonusIcons,
  SkillStatsIcons,
} from "@/components/skills/icons/AbilityBonusIcons";
import {
  SkillCardEffectsList,
  SkillCardTriggersList,
} from "@/components/skills/list/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMainSkills, useUpdateSkill } from "@/lib/hooks/skills";
import {
  getSkillBonuses,
  getSkillCombatStats,
  getSkillDescription,
  getSkillEffects,
  getSkillIcon,
  getSkillId,
  getSkillMainSkillId,
  getSkillName,
  getSkillSpell,
  getSkillTriggers,
} from "@/lib/utils/skills/skill-helpers";
import type { GroupedSkill, Skill } from "@/types/skills";

export interface SkillCardProps {
  skill: Skill | GroupedSkill;
  campaignId: string;
  /** Викликається при підтвердженні видалення скіла */
  onRemove?: (skillId: string) => void;
  /** Викликається при дублюванні скіла (створює копію з новим id) */
  onDuplicate?: (skillId: string) => void;
}

export function SkillCard({
  skill,
  campaignId,
  onRemove,
  onDuplicate,
}: SkillCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const updateSkillMutation = useUpdateSkill(campaignId);

  const skillId = getSkillId(skill);

  const currentMainSkillId = getSkillMainSkillId(skill) ?? null;

  const skillName = getSkillName(skill);

  const skillDescription = getSkillDescription(skill);

  const skillIcon = getSkillIcon(skill);

  const skillBonuses = getSkillBonuses(skill);

  const combatStats = getSkillCombatStats(skill);

  const skillSpell = getSkillSpell(skill);

  const effects = getSkillEffects(skill);

  const triggers = getSkillTriggers(skill);

  const handleConfirmRemove = () => {
    onRemove?.(skillId);
    setShowDeleteDialog(false);
  };

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-lg transition-shadow flex flex-col justify-between h-full">
      <div>
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
          <SkillCardActionsMenu
            skillId={skillId}
            currentMainSkillId={currentMainSkillId}
            mainSkills={mainSkills}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
            onOpenDeleteDialog={() => setShowDeleteDialog(true)}
            onUpdateMainSkill={(mainSkillId) => {
              updateSkillMutation.mutate({
                skillId,
                data: { mainSkillData: { mainSkillId } },
              });
            }}
          />
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

          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={combatStats.affectsDamage ?? false}
                onCheckedChange={(checked) => {
                  const next = !!checked;

                  const baseStats =
                    "combatStats" in skill ? (skill.combatStats as Record<string, unknown>) ?? {} : {};

                  updateSkillMutation.mutate({
                    skillId,
                    data: {
                      combatStats: {
                        ...baseStats,
                        affectsDamage: next,
                        damageType:
                          next && !combatStats.damageType
                            ? "melee"
                            : combatStats.damageType ?? undefined,
                      },
                    },
                  });
                }}
                disabled={updateSkillMutation.isPending}
              />
              <span className="text-xs font-medium">Впливає на шкоду</span>
            </label>
            {combatStats.affectsDamage && combatStats.damageType && (
              <Badge variant="secondary" className="text-xs font-normal">
                {combatStats.damageType === "melee"
                  ? "ближній бій"
                  : combatStats.damageType === "ranged"
                    ? "дальній бій"
                    : "магія"}
              </Badge>
            )}
          </div>

          <SkillCardEffectsList effects={effects} />
          <SkillCardTriggersList triggers={triggers} />

          {skillSpell && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold">Покращення спела:</span>{" "}
              {skillSpell.name}
            </div>
          )}
        </div>
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

      <SkillCardDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        skillName={skillName}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}
