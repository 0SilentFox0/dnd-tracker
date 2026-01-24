"use client";

import {
  Edit,
  Flame,
  Moon,
  MoreVertical,
  Shell,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

import { RemoveAllSpellsDialog } from "@/components/spells/dialogs/RemoveAllSpellsDialog";
import { RenameGroupDialog } from "@/components/spells/dialogs/RenameGroupDialog";
import { SpellLevelAccordion } from "@/components/spells/list/SpellLevelAccordion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSpellGroupActions } from "@/lib/hooks/useSpellGroupActions";
import { calculateTotalSpellsInGroup } from "@/lib/utils/spells/spells";
import type { Spell, SpellGroup } from "@/types/spells";

interface SpellGroupIconProps {
  groupName: string;
  className?: string;
}

function SpellGroupIcon({ groupName, className }: SpellGroupIconProps) {
  switch (groupName) {
    case "Dark":
      return <Moon className={className} />;
    case "Destr":
      return <Flame className={className} />;
    case "Summ":
      return <Sparkles className={className} />;
    case "Light":
      return <Sun className={className} />;
    default:
      return <Shell className={className} />;
  }
}

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
      <AccordionItem value={groupName} key={groupName}>
        <div className="relative">
          <AccordionTrigger className="px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4 text-left w-full">
              <SpellGroupIcon
                groupName={groupName}
                className="h-6 w-6 sm:h-7 sm:w-7 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{groupName}</CardTitle>
                <CardDescription className="mt-1">
                  {totalSpells} заклинань
                </CardDescription>
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
