"use client";

import { SkillGroupAccordionItem } from "@/components/skills/list/SkillGroupAccordionItem";
import { RemoveAllSpellsDialog } from "@/components/spells/dialogs/RemoveAllSpellsDialog";
import { RenameGroupDialog } from "@/components/spells/dialogs/RenameGroupDialog";
import { useSpellGroupActions } from "@/lib/hooks/useSpellGroupActions";
import { calculateTotalSkillsInGroup } from "@/lib/utils/skills/skills";
import type { GroupedSkill, Skill } from "@/types/skills";
import type { SpellGroup } from "@/types/spells";

/** hex #RRGGBB → rgba(..., 0.4) */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");

  if (h.length !== 6) return hex;

  const r = parseInt(h.slice(0, 2), 16);

  const g = parseInt(h.slice(2, 4), 16);

  const b = parseInt(h.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

interface SkillGroupAccordionProps {
  groupName: string;
  skills: (Skill | GroupedSkill)[];
  campaignId: string;
  spellGroups: SpellGroup[];
  /** Колір основного навику для підсвітки акордеону (40% opacity) */
  mainSkillColor?: string | null;
  /** Викликається при видаленні одного скіла (DM) */
  onDeleteSkill?: (skillId: string) => void;
  /** Викликається при дублюванні скіла (DM) */
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
  const accordionBg =
    mainSkillColor != null && mainSkillColor
      ? hexToRgba(mainSkillColor, 0.6)
      : undefined;

  const groupId = spellGroups.find((g) => g.name === groupName)?.id;

  const isUngrouped =
    groupName === "Без групи" || groupName === "Без основного навику";

  const totalSkills = calculateTotalSkillsInGroup(skills);

  const {
    renameDialogOpen,
    removeAllDialogOpen,
    newGroupName,
    setNewGroupName,
    setRenameDialogOpen,
    setRemoveAllDialogOpen,
    handleRenameGroup,
    handleRemoveAllSpells,
    openRenameDialog,
    closeRenameDialog,
    isRenaming,
    isRemoving,
  } = useSpellGroupActions({
    campaignId,
    groupName,
    groupId,
  });

  return (
    <>
      <SkillGroupAccordionItem
        groupName={groupName}
        accordionBg={accordionBg}
        totalSkills={totalSkills}
        isUngrouped={isUngrouped}
        groupId={groupId}
        onRenameClick={openRenameDialog}
        onRemoveAllClick={() => setRemoveAllDialogOpen(true)}
        onDeleteSkill={onDeleteSkill}
        onDuplicateSkill={onDuplicateSkill}
        skills={skills}
        campaignId={campaignId}
      />

      <RenameGroupDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        groupName={groupName}
        newGroupName={newGroupName}
        onNewGroupNameChange={setNewGroupName}
        onConfirm={handleRenameGroup}
        onCancel={closeRenameDialog}
        isRenaming={isRenaming}
      />

      <RemoveAllSpellsDialog
        open={removeAllDialogOpen}
        onOpenChange={setRemoveAllDialogOpen}
        groupName={groupName}
        onConfirm={handleRemoveAllSpells}
        isRemoving={isRemoving}
      />
    </>
  );
}
