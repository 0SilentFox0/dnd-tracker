"use client";

import { Edit, X } from "lucide-react";

import { GroupAccordionItem } from "@/components/common/GroupAccordionItem";
import { RenameGroupDialog } from "@/components/common/RenameGroupDialog";
import { type SpellGroupItemActions, SpellLevelAccordion } from "@/components/spells/list/SpellLevelAccordion";
import { Accordion } from "@/components/ui/accordion";
import { groupDisplayName, isUngroupedKey, UNGROUPED_LABELS } from "@/lib/constants/ungrouped";
import { useSpellGroupActions } from "@/lib/hooks/spells";
import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";
import { calculateTotalSpellsInGroup } from "@/lib/utils/spells/spells";
import type { Spell, SpellGroup } from "@/types/spells";

interface SpellGroupAccordionProps {
  groupName: string;
  levels: [string, Spell[]][];
  campaignId: string;
  spellGroups: SpellGroup[];
  spellActions: SpellGroupItemActions;
}

export function SpellGroupAccordion({
  groupName,
  levels,
  campaignId,
  spellGroups,
  spellActions,
}: SpellGroupAccordionProps) {
  const group = spellGroups.find((g) => g.name === groupName);

  const groupId = group?.id;

  const isUngrouped = isUngroupedKey(groupName);

  const displayName = groupDisplayName(groupName, UNGROUPED_LABELS.spellGroup);

  const totalSpells = calculateTotalSpellsInGroup(levels);

  const GroupIcon = getSpellGroupIcon(group);

  const actions = useSpellGroupActions({
    campaignId,
    groupName: displayName,
    groupId,
  });

  const menuActions =
    !isUngrouped && groupId
      ? [
          { label: "Перейменувати групу", icon: Edit, onSelect: actions.handlers.openRenameDialog },
          { label: "Видалити всі заклинання з групи", icon: X, onSelect: () => void actions.handlers.confirmRemoveAll() },
        ]
      : undefined;

  return (
    <>
      <GroupAccordionItem
        value={groupName}
        title={displayName}
        countLabel={`${totalSpells} заклинань`}
        icon={GroupIcon}
        menuActions={menuActions}
      >
        <Accordion
          type="multiple"
          defaultValue={levels.map(([levelName]) => levelName)}
          className="space-y-2"
        >
          {levels.map(([levelName, levelSpells]) => {
            const level = levelSpells[0]?.level ?? 0;

            return (
              <SpellLevelAccordion
                key={levelName}
                levelName={levelName}
                level={level}
                spells={levelSpells}
                campaignId={campaignId}
                spellGroups={spellGroups}
                actions={spellActions}
              />
            );
          })}
        </Accordion>
      </GroupAccordionItem>

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
