"use client";

import Link from "next/link";

import { SkillCardActionsMenu } from "./SkillCardActionsMenu";

import { AbilitySummary } from "@/components/abilities";
import { EntityIcon } from "@/components/common/EntityIcon";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import { useMainSkills, useUpdateSkill } from "@/lib/hooks/skills";
import {
  getSkillDescription,
  getSkillIcon,
  getSkillId,
  getSkillMainSkillId,
  getSkillName,
  getSkillSpell,
} from "@/lib/utils/skills/skill-helpers";
import type { GroupedSkill, Skill } from "@/types/skills";

export interface SkillCardProps {
  skill: Skill | GroupedSkill;
  campaignId: string;
  onRemove?: (skillId: string) => Promise<unknown> | void;
  /** Викликається при дублюванні скіла (створює копію з новим id) */
  onDuplicate?: (skillId: string) => void;
  /** Режим версії для друку: ховає інтерактивні елементи, розкриває обрізаний опис */
  printMode?: boolean;
}

export function SkillCard({
  skill,
  campaignId,
  onRemove,
  onDuplicate,
  printMode = false,
}: SkillCardProps) {
  const confirm = useConfirm();

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const updateSkillMutation = useUpdateSkill(campaignId);

  const skillId = getSkillId(skill);

  const currentMainSkillId = getSkillMainSkillId(skill) ?? null;

  const skillName = getSkillName(skill);

  const skillDescription = getSkillDescription(skill);

  const skillIcon = getSkillIcon(skill);

  const skillSpell = getSkillSpell(skill);

  const abilitySummary = skill.abilitySummary ?? [];

  const handleRemove = () =>
    confirm({
      title: "Видалити скіл?",
      description: `Скіл "${skillName}" буде видалено. Цю дію неможливо скасувати.`,
      confirmLabel: "Видалити",
      destructive: true,
      onConfirm: async () => {
        await onRemove?.(skillId);
      },
    });

  return (
    <div
      className={`border rounded-lg bg-card hover:shadow-lg transition-shadow flex flex-col justify-between h-full ${
        printMode ? "p-2" : "p-4"
      }`}
    >
      <div>
        <div className={`flex items-start gap-2 ${printMode ? "mb-1.5" : "mb-3"}`}>
          {skillIcon && <EntityIcon src={skillIcon} name={skillName} size={64} className={`rounded-lg text-xl ${printMode ? "size-9" : "size-12 sm:size-16"}`} />}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-semibold flex-1 min-w-0 truncate ${
                  printMode ? "text-xs leading-tight" : "text-sm sm:text-base"
                }`}
              >
                {skillName}
              </h3>
            </div>
          </div>
          {!printMode && (
            <SkillCardActionsMenu
              skillId={skillId}
              currentMainSkillId={currentMainSkillId}
              mainSkills={mainSkills}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onOpenDeleteDialog={() => void handleRemove()}
              onUpdateMainSkill={(mainSkillId) => {
                updateSkillMutation.mutate({
                  skillId,
                  data: { mainSkillData: { mainSkillId } },
                });
              }}
            />
          )}
        </div>

        {skillDescription && (
          <p
            className={`text-muted-foreground ${
              printMode
                ? "text-[11px] leading-snug mb-1.5"
                : "text-xs sm:text-sm mb-3 line-clamp-2"
            }`}
          >
            {skillDescription}
          </p>
        )}

        <div className={printMode ? "space-y-1 mb-1.5" : "space-y-2 mb-3"}>
          {abilitySummary.length > 0 && <AbilitySummary lines={abilitySummary} />}

          {skillSpell && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold">Покращення спела:</span>{" "}
              {skillSpell.name}
            </div>
          )}
        </div>
      </div>
      {!printMode && (
        <>
          <Link href={`/campaigns/${campaignId}/dm/skills/${skillId}`}>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs sm:text-sm"
            >
              Редагувати
            </Button>
          </Link>

        </>
      )}
    </div>
  );
}
