"use client";

import { SkillGroupAccordionItem } from "@/components/skills/list/SkillGroupAccordionItem";
import { RenameGroupDialog } from "@/components/spells/dialogs/RenameGroupDialog";
import { useSpellGroupActions } from "@/lib/hooks/spells";
import { calculateTotalSkillsInGroup } from "@/lib/utils/skills/skills";
import type { GroupedSkill, Skill } from "@/types/skills";
import type { SpellGroup } from "@/types/spells";

interface SkillGroupAccordionProps {
  groupName: string;
  skills: (Skill | GroupedSkill)[];
  campaignId: string;
  spellGroups: SpellGroup[];
  mainSkillColor?: string | null;
  onDeleteSkill?: (skillId: string) => Promise<unknown> | void;
  onDuplicateSkill?: (skillId: string) => void;
}

export function SkillGroupAccordion({
  groupName,
  skills,
  campaignId,
  spellGroups,
  mainSkillColor,
  onDeleteSkill,
  onDuplicateSkill,
}: SkillGroupAccordionProps) {
  const groupId = spellGroups.find((g) => g.name === groupName)?.id;

  const isUngrouped =
    groupName === "Без групи" || groupName === "Без основного навику";

  const totalSkills = calculateTotalSkillsInGroup(skills);

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
        totalSkills={totalSkills}
        isUngrouped={isUngrouped}
        groupId={groupId}
        onRenameClick={actions.handlers.openRenameDialog}
        onRemoveAllClick={() => void actions.handlers.confirmRemoveAll()}
        onDeleteSkill={onDeleteSkill}
        onDuplicateSkill={onDuplicateSkill}
        skills={skills}
        campaignId={campaignId}
      />

      <RenameGroupDialog
        open={actions.dialogs.rename.open}
        onOpenChange={actions.dialogs.rename.setOpen}
        groupName={groupName}
        newGroupName={actions.state.newGroupName}
        onNewGroupNameChange={actions.state.setNewGroupName}
        onConfirm={actions.handlers.handleRenameGroup}
        onCancel={actions.handlers.closeRenameDialog}
        isRenaming={actions.pending.isRenaming}
      />

    </>
  );
}
