"use client";

import { useTranslations } from "next-intl";
import { Edit, X } from "lucide-react";

import { GroupAccordionItem } from "@/components/common/GroupAccordionItem";
import { SkillCard, type SkillCardActions } from "@/components/skills/list/SkillCard";
import { groupDisplayName, UNGROUPED_LABELS } from "@/lib/constants/ungrouped";
import type { Skill } from "@/types/skills";

export interface SkillGroupAccordionItemProps {
  groupName: string;
  accent?: string;
  totalSkills: number;
  groupMenu?: { onRename: () => void; onRemoveAll: () => void };
  actions?: SkillCardActions;
  skills: Skill[];
  campaignId: string;
}

export function SkillGroupAccordionItem({
  groupName,
  accent,
  totalSkills,
  groupMenu,
  actions,
  skills,
  campaignId,
}: SkillGroupAccordionItemProps) {
  const t = useTranslations();

  const menuActions = groupMenu
    ? [
        { label: t("common.renameGroup.title"), icon: Edit, onSelect: groupMenu.onRename },
        { label: t("skills.group.removeAll"), icon: X, onSelect: groupMenu.onRemoveAll },
      ]
    : undefined;

  return (
    <GroupAccordionItem
      value={groupName}
      title={groupDisplayName(groupName, UNGROUPED_LABELS.mainSkill)}
      countLabel={t("skills.group.count", { count: totalSkills })}
      accent={accent}
      className="rounded-lg overflow-hidden"
      menuActions={menuActions}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-4 sm:px-6 pb-4">
        {skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} campaignId={campaignId} actions={actions} />
        ))}
      </div>
    </GroupAccordionItem>
  );
}
