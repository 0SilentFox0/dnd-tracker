"use client";

import { useState, useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import {
  useSpells,
  useSpellGroups,
  useRemoveSpellFromGroup,
  useMoveSpellToGroup,
  useDeleteAllSpells,
} from "@/lib/hooks/useSpells";
import type { Spell } from "@/lib/api/spells";
import {
  groupSpellsByGroupAndLevel,
  convertGroupedSpellsToArray,
} from "@/lib/utils/spells";
import { SpellsPageHeader } from "@/components/spells/SpellsPageHeader";
import { SpellGroupAccordion } from "@/components/spells/SpellGroupAccordion";
import { DeleteAllSpellsDialog } from "@/components/spells/DeleteAllSpellsDialog";

interface DMSpellsPageClientProps {
  campaignId: string;
  initialSpells: Spell[];
}

export function DMSpellsPageClient({
  campaignId,
  initialSpells,
}: DMSpellsPageClientProps) {
  const [deleteAllSpellsDialogOpen, setDeleteAllSpellsDialogOpen] =
    useState(false);

  // Запити для заклинань та груп
  const { data: spells = initialSpells, isLoading: spellsLoading } = useSpells(
    campaignId,
    initialSpells
  );
  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  // Мутації
  const removeSpellFromGroupMutation = useRemoveSpellFromGroup(campaignId);
  const moveSpellMutation = useMoveSpellToGroup(campaignId);
  const deleteAllSpellsMutation = useDeleteAllSpells(campaignId);

  const handleRemoveSpellFromGroup = (spellId: string) => {
    removeSpellFromGroupMutation.mutate(spellId);
  };

  const handleMoveSpellToGroup = (spellId: string, groupId: string | null) => {
    moveSpellMutation.mutate({ spellId, groupId });
  };

  const handleDeleteAllSpells = () => {
    deleteAllSpellsMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleteAllSpellsDialogOpen(false);
      },
    });
  };

  // Групуємо заклинання спочатку по групах, потім по рівнях
  const sortedGroupedSpells = useMemo(() => {
    const groupedSpellsMap = groupSpellsByGroupAndLevel(spells);
    return convertGroupedSpellsToArray(groupedSpellsMap);
  }, [spells]);

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6 max-w-full">
      <SpellsPageHeader
        campaignId={campaignId}
        spellsCount={spells.length}
        onDeleteAll={() => setDeleteAllSpellsDialogOpen(true)}
      />

      {spellsLoading && (
        <div className="text-center py-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            Оновлення...
          </p>
        </div>
      )}

      {!spellsLoading && spells.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-muted-foreground">
            Заклинання ще не додані. Створіть перше заклинання або імпортуйте їх
            з файлу.
          </p>
        </div>
      ) : (
        <Accordion className="space-y-2 sm:space-y-4">
          {sortedGroupedSpells.map(([groupName, levels]) => (
            <SpellGroupAccordion
              key={groupName}
              groupName={groupName}
              levels={levels}
              campaignId={campaignId}
              spellGroups={spellGroups}
              onRemoveSpellFromGroup={handleRemoveSpellFromGroup}
              onMoveSpellToGroup={handleMoveSpellToGroup}
            />
          ))}
        </Accordion>
      )}

      <DeleteAllSpellsDialog
        open={deleteAllSpellsDialogOpen}
        onOpenChange={setDeleteAllSpellsDialogOpen}
        spellsCount={spells.length}
        onConfirm={handleDeleteAllSpells}
        isDeleting={deleteAllSpellsMutation.isPending}
      />
    </div>
  );
}
