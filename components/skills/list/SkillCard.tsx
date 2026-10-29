"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { SkillCardActionsMenu } from "./SkillCardActionsMenu";

import { AbilityFlowList } from "@/components/abilities/AbilityFlow";
import { EntityIcon } from "@/components/common/EntityIcon";
import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import { useMainSkills, useUpdateSkill } from "@/lib/hooks/skills";
import type { Skill } from "@/types/skills";

export interface SkillCardActions {
  onDelete?: (skillId: string) => Promise<unknown> | void;
  onDuplicate?: (skillId: string) => void;
}

export interface SkillCardProps {
  skill: Skill;
  campaignId: string;
  actions?: SkillCardActions;
  /** Режим версії для друку: ховає інтерактивні елементи, розкриває обрізаний опис */
  printMode?: boolean;
}

function SkillCardShell({ printMode, children }: { printMode: boolean; children: ReactNode }) {
  return printMode ? (
    <div className="border rounded-lg bg-card hover:shadow-lg transition-shadow flex flex-col justify-between h-full p-2">{children}</div>
  ) : (
    <HudCard className="flex h-full flex-col justify-between p-4">{children}</HudCard>
  );
}

export function SkillCard({
  skill,
  campaignId,
  actions,
  printMode = false,
}: SkillCardProps) {
  const t = useTranslations();

  const confirm = useConfirm();

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const updateSkillMutation = useUpdateSkill(campaignId);

  const { id: skillId, name: skillName, description: skillDescription, icon: skillIcon, spell: skillSpell } = skill;

  const { onDelete, onDuplicate } = actions ?? {};

  const abilitySummary = skill.abilitySummary ?? [];

  const handleRemove = () =>
    confirm({
      title: t("skills.card.deleteTitle"),
      description: t("skills.card.deleteDescription", { name: skillName }),
      confirmLabel: t("common.actions.delete"),
      destructive: true,
      onConfirm: async () => {
        await onDelete?.(skillId);
      },
    });

  return (
    <SkillCardShell printMode={printMode}>
      <div>
        <div className={`flex items-start gap-2 ${printMode ? "mb-1.5" : "mb-3"}`}>
          {printMode ? (
            skillIcon && <EntityIcon src={skillIcon} name={skillName} size={64} className="size-9 rounded-lg text-xl" />
          ) : (
            <span className="metal-bronze flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[radial-gradient(#2c2219,#0f0c09)] p-0.5 shadow-[inset_0_0_0_2px_var(--m2)] sm:size-14">
              <EntityIcon src={skillIcon} name={skillName} size={56} className="hud-sc size-full rounded-[4px] bg-transparent text-lg text-[#e8d6b0]" />
            </span>
          )}
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
              currentMainSkillId={skill.mainSkillId ?? null}
              mainSkills={mainSkills}
              actions={{
                onSelectMainSkill: (mainSkillId) => updateSkillMutation.mutate({ skillId, data: { mainSkillData: { mainSkillId } } }),
                onDuplicate: onDuplicate && (() => onDuplicate(skillId)),
                onDelete: onDelete && (() => void handleRemove()),
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
          {abilitySummary.length > 0 && <AbilityFlowList lines={abilitySummary} />}

          {skillSpell && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold">{t("skills.card.spellUpgrade")}</span>{" "}
              {skillSpell.name}
            </div>
          )}
        </div>
      </div>
      {!printMode && (
        <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm" asChild>
          <Link href={`/campaigns/${campaignId}/dm/skills/${skillId}`}>{t("common.actions.edit")}</Link>
        </Button>
      )}
    </SkillCardShell>
  );
}
