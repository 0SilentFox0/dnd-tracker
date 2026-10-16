"use client";

import { Edit, X } from "lucide-react";

import { GroupAccordionItem } from "@/components/common/GroupAccordionItem";
import { SkillCard } from "@/components/skills/list/SkillCard";
import { groupDisplayName, UNGROUPED_LABELS } from "@/lib/constants/ungrouped";
import { getSkillId } from "@/lib/utils/skills/skill-helpers";
import type { GroupedSkill, Skill } from "@/types/skills";

export interface SkillGroupAccordionItemProps {
  groupName: string;
  accent?: string;
  totalSkills: number;
  isUngrouped: boolean;
  groupId: string | undefined;
  onRenameClick: () => void;
  onRemoveAllClick: () => void;
  onDeleteSkill?: (skillId: string) => Promise<unknown> | void;
  onDuplicateSkill?: (skillId: string) => void;
  skills: (Skill | GroupedSkill)[];
  campaignId: string;
}

export function SkillGroupAccordionItem({
  groupName,
  accent,
  totalSkills,
  isUngrouped,
  groupId,
  onRenameClick,
  onRemoveAllClick,
  onDeleteSkill,
  onDuplicateSkill,
  skills,
  campaignId,
}: SkillGroupAccordionItemProps) {
  const menuActions =
    !isUngrouped && groupId
      ? [
          { label: "Перейменувати групу", icon: Edit, onSelect: onRenameClick },
          { label: "Видалити всі скіли з групи", icon: X, onSelect: onRemoveAllClick },
        ]
      : undefined;

  return (
    <GroupAccordionItem
      value={groupName}
      title={groupDisplayName(groupName, UNGROUPED_LABELS.mainSkill)}
      countLabel={`${totalSkills} скілів`}
      accent={accent}
      className="rounded-lg overflow-hidden"
      menuActions={menuActions}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-4 sm:px-6 pb-4">
        {skills.map((skill) => (
          <SkillCard
            key={getSkillId(skill)}
            skill={skill}
            campaignId={campaignId}
            onRemove={onDeleteSkill}
            onDuplicate={onDuplicateSkill}
          />
        ))}
      </div>
    </GroupAccordionItem>
  );
}
