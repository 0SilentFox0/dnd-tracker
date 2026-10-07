"use client";

import { Edit, MoreVertical, X } from "lucide-react";

import { RenameGroupDialog } from "@/components/spells/dialogs/RenameGroupDialog";
import { SpellLevelAccordion } from "@/components/spells/list/SpellLevelAccordion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSpellGroupActions } from "@/lib/hooks/spells";
import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";
import { calculateTotalSpellsInGroup } from "@/lib/utils/spells/spells";
import type { Spell, SpellGroup } from "@/types/spells";

interface SpellGroupAccordionProps {
  groupName: string;
  levels: [string, Spell[]][];
  campaignId: string;
  spellGroups: SpellGroup[];
  onRemoveSpellFromGroup: (spellId: string) => void;
  onMoveSpellToGroup: (spellId: string, groupId: string | null) => void;
}

export function SpellGroupAccordion({
  groupName,
  levels,
  campaignId,
  spellGroups,
  onRemoveSpellFromGroup,
  onMoveSpellToGroup,
}: SpellGroupAccordionProps) {
  const groupId = spellGroups.find((g) => g.name === groupName)?.id;

  const isUngrouped = groupName === "Без групи";

  const totalSpells = calculateTotalSpellsInGroup(levels);

  const GroupIcon = getSpellGroupIcon(groupName);

  const actions = useSpellGroupActions({
    campaignId,
    groupName,
    groupId,
  });

  return (
    <>
      <AccordionItem value={groupName} key={groupName}>
        <div className="relative">
          <AccordionTrigger className="px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4 text-left w-full">
              <GroupIcon className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-hud-gold" />
              <div className="flex-1 min-w-0">
                <h3 className="hud-sc truncate text-lg text-hud-ink">{groupName}</h3>
                <p className="mt-1 text-sm text-hud-muted">{totalSpells} заклинань</p>
              </div>
            </div>
          </AccordionTrigger>
          {!isUngrouped && groupId && (
            <div
              className="absolute right-12 sm:right-14 top-1/2 -translate-y-1/2 z-10"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12"
                  >
                    <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.handlers.openRenameDialog();
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Перейменувати групу
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      void actions.handlers.confirmRemoveAll();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Видалити всі заклинання з групи
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <AccordionContent>
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
                  onRemoveSpellFromGroup={onRemoveSpellFromGroup}
                  onMoveSpellToGroup={onMoveSpellToGroup}
                />
              );
            })}
          </Accordion>
        </AccordionContent>
      </AccordionItem>

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
