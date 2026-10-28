"use client";

import { useTranslations } from "next-intl";
import { Edit, Trash2 } from "lucide-react";

import { ActionsMenu } from "@/components/common/ActionsMenu";
import { EntityIcon } from "@/components/common/EntityIcon";
import { HudCard } from "@/components/hud/page";
import type { MainSkill } from "@/types/main-skills";

interface MainSkillCardProps {
  mainSkill: MainSkill;
  campaignId: string;
  onDelete: (mainSkillId: string) => void;
}

export function MainSkillCard({
  mainSkill,
  campaignId,
  onDelete,
}: MainSkillCardProps) {
  const t = useTranslations();

  return (
    <HudCard accent={mainSkill.color} className="space-y-3">
      <div>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="hud-sc flex items-center gap-2 text-hud-ink">
              <div
                className="h-4 w-4 shrink-0 rounded-full border-2 border-hud-line"
                style={{ backgroundColor: mainSkill.color }}
              />
              {mainSkill.name}
            </h3>
            <p className="mt-2 break-all text-sm text-hud-muted">{t("skills.mainSkills.card.id", { id: mainSkill.id })}</p>
          </div>
          <ActionsMenu
            triggerSize="sm"
            actions={[
              { label: t("common.actions.edit"), icon: Edit, href: `/campaigns/${campaignId}/dm/main-skills/${mainSkill.id}` },
              { label: t("common.actions.delete"), icon: Trash2, onSelect: () => onDelete(mainSkill.id), destructive: true },
            ]}
          />
        </div>
      </div>
      <div>
        <div className="space-y-2">
          <div>
            <span className="text-sm font-semibold">{t("skills.mainSkills.card.color")}</span>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="h-8 w-8 rounded border-2 border-hud-line"
                style={{ backgroundColor: mainSkill.color }}
              />
              <span className="rounded-full px-2 text-xs text-hud-bone" style={{ boxShadow: `inset 0 0 0 1px ${mainSkill.color}` }}>
                {mainSkill.color}
              </span>
            </div>
          </div>
          {mainSkill.icon && (
            <div>
              <span className="text-sm font-semibold">{t("skills.mainSkills.card.icon")}</span>
              <EntityIcon src={mainSkill.icon} name={mainSkill.name} size={32} emoji className="mt-1 size-8 rounded bg-hud-field text-xl text-inherit" />
            </div>
          )}
        </div>
      </div>
    </HudCard>
  );
}
