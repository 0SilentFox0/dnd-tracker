"use client";

import { RenameGroupDialog } from "@/components/common/RenameGroupDialog";
import type { SkillCardActions } from "@/components/skills/list/SkillCard";
import { SkillGroupAccordionItem } from "@/components/skills/list/SkillGroupAccordionItem";
import { isUngroupedKey } from "@/lib/constants/ungrouped";
import { useSpellGroupActions } from "@/lib/hooks/spells";
import type { Skill } from "@/types/skills";
import type { SpellGroup } from "@/types/spells";

interface SkillGroupAccordionProps {
  groupName: string;
  skills: Skill[];
  campaignId: string;
  spellGroups: SpellGroup[];
  mainSkillColor?: string | null;
  actions?: SkillCardActions;
}

export function SkillGroupAccordion({
  groupName,
  skills,
  campaignId,
  spellGroups,
  mainSkillColor,
  actions: skillActions,
}: SkillGroupAccordionProps) {
  const groupId = spellGroups.find((g) => g.name === groupName)?.id;

  const isUngrouped = isUngroupedKey(groupName);

  const actions = useSpellGroupActions({
    campaignId,
    groupName,
    groupId,
  });

  return (
    <>
      <SkillGroupAccordionItem
        groupName={groupName}
        accent={mainSkillColor || undefined}
        totalSkills={skills.length}
        groupMenu={
          !isUngrouped && groupId
            ? {
                onRename: actions.handlers.openRenameDialog,
                onRemoveAll: () => void actions.handlers.confirmRemoveAll(),
              }
            : undefined
        }
        actions={skillActions}
        skills={skills}
        campaignId={campaignId}
      />

      <RenameGroupDialog
        groupName={groupName}
        dialog={{ open: actions.dialogs.rename.open, onOpenChange: actions.dialogs.rename.setOpen }}
        rename={{
          value: actions.state.newGroupName,
          onChange: actions.state.setNewGroupName,
          onConfirm: actions.handlers.handleRenameGroup,
          onCancel: actions.handlers.closeRenameDialog,
          isPending: actions.pending.isRenaming,
        }}
      />

    </>
  );
}
