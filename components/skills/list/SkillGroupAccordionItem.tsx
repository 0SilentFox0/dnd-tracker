'use client';

import { useTranslations } from 'next-intl';
import { Edit, X } from 'lucide-react';

import { GroupAccordionItem } from '@/components/common/GroupAccordionItem';
import {
    SkillCard,
    type SkillCardActions,
} from '@/components/skills/list/SkillCard';
import { groupDisplayName } from '@/lib/constants/ungrouped';
import type { Skill } from '@/types/skills';

export interface SkillGroupAccordionItemProps {
    groupName: string;
    accent?: string;
    totalSkills: number;
    groupMenu?: { onRename: () => void; onRemoveAll: () => void };
    actions?: SkillCardActions;
    skills: Skill[];
    campaignId: string;
    canEdit?: boolean;
}

export function SkillGroupAccordionItem({
    groupName,
    accent,
    totalSkills,
    groupMenu,
    actions,
    skills,
    campaignId,
    canEdit = true,
}: SkillGroupAccordionItemProps) {
    const t = useTranslations();

    const menuActions = groupMenu
        ? [
              {
                  label: t('common.renameGroup.title'),
                  icon: Edit,
                  onSelect: groupMenu.onRename,
              },
              {
                  label: t('skills.group.removeAll'),
                  icon: X,
                  onSelect: groupMenu.onRemoveAll,
              },
          ]
        : undefined;

    return (
        <GroupAccordionItem
            value={groupName}
            title={groupDisplayName(groupName, t('skills.group.ungrouped'))}
            countLabel={t('skills.group.count', { count: totalSkills })}
            accent={accent}
            className="overflow-hidden rounded-lg"
            menuActions={menuActions}
        >
            <div className="grid gap-4 px-4 pb-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
                {skills.map((skill) => (
                    <SkillCard
                        key={skill.id}
                        skill={skill}
                        campaignId={campaignId}
                        actions={actions}
                        canEdit={canEdit}
                    />
                ))}
            </div>
        </GroupAccordionItem>
    );
}
