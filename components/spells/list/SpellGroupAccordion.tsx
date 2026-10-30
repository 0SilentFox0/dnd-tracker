"use client";

import { useTranslations } from "next-intl";
import { Edit, X } from "lucide-react";

import { GroupAccordionItem } from "@/components/common/GroupAccordionItem";
import { RenameGroupDialog } from "@/components/common/RenameGroupDialog";
import { type SpellGroupItemActions, SpellLevelAccordion } from "@/components/spells/list/SpellLevelAccordion";
import { Accordion } from "@/components/ui/accordion";
import { groupDisplayName, isUngroupedKey } from "@/lib/constants/ungrouped";
import { useSpellGroupActions } from "@/lib/hooks/spells";
import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";
import { calculateTotalSpellsInGroup } from "@/lib/utils/spells/spells";
import type { Spell, SpellGroup } from "@/types/spells";

interface SpellGroupAccordionProps {
  groupName: string;
  levels: [number, Spell[]][];
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
  const t = useTranslations("spells");

  const tc = useTranslations("gameTerms.ungrouped");

  const group = spellGroups.find((g) => g.name === groupName);

  const groupId = group?.id;

  const isUngrouped = isUngroupedKey(groupName);

  const displayName = groupDisplayName(groupName, tc("spellGroup"));

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
          { label: t("groupActions.rename"), icon: Edit, onSelect: actions.handlers.openRenameDialog },
          { label: t("groupActions.removeAll"), icon: X, onSelect: () => void actions.handlers.confirmRemoveAll() },
        ]
      : undefined;

  return (
    <>
      <GroupAccordionItem
        value={groupName}
        title={displayName}
        countLabel={t("list.count", { count: totalSpells })}
        icon={GroupIcon}
        menuActions={menuActions}
      >
        <Accordion
          type="multiple"
          defaultValue={levels.map(([level]) => String(level))}
          className="space-y-2"
        >
          {levels.map(([level, levelSpells]) => {
            return (
              <SpellLevelAccordion
                key={level}
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
