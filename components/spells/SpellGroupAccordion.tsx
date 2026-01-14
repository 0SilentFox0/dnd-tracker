"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, X } from "lucide-react";
import { SpellLevelAccordion } from "./SpellLevelAccordion";
import type { Spell, SpellGroup } from "@/lib/api/spells";
import { getSpellGroupIcon } from "@/lib/utils/spell-icons";
import { calculateTotalSpellsInGroup } from "@/lib/utils/spells";
import { useSpellGroupActions } from "@/lib/hooks/useSpellGroupActions";
import { RenameGroupDialog } from "./RenameGroupDialog";
import { RemoveAllSpellsDialog } from "./RemoveAllSpellsDialog";

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
      <AccordionItem key={groupName} defaultOpen={true}>
        <AccordionTrigger className="px-4 sm:px-6 pr-14 sm:pr-16 relative">
          <div className="flex items-center gap-3 sm:gap-4 text-left w-full">
            <GroupIcon className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{groupName}</CardTitle>
              <CardDescription className="mt-1">
                {totalSpells} заклинань
              </CardDescription>
            </div>
          </div>
          {!isUngrouped && groupId && (
            <div
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12">
                    <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openRenameDialog();
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Перейменувати групу
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemoveAllDialogOpen(true);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Видалити всі заклинання з групи
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </AccordionTrigger>
        <AccordionContent>
          <Accordion className="space-y-2">
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
