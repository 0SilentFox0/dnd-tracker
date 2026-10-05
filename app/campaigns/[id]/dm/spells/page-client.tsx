"use client";

import { useMemo,useState } from "react";
import { Wand2 } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { DeleteAllSpellsDialog } from "@/components/spells/dialogs/DeleteAllSpellsDialog";
import { SpellGroupAccordion } from "@/components/spells/list/SpellGroupAccordion";
import { SpellsPageHeader } from "@/components/spells/ui/SpellsPageHeader";
import { Accordion } from "@/components/ui/accordion";
import {
  useDeleteAllSpells,
  useMoveSpellToGroup,
  useRemoveSpellFromGroup,
  useSpellGroups,
  useSpells,
} from "@/lib/hooks/spells";
import {
  convertGroupedSpellsToArray,
  groupSpellsByGroupAndLevel,
} from "@/lib/utils/spells/spells";
import type { Spell } from "@/types/spells";

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

  const { data: spells = initialSpells, isLoading: spellsLoading } = useSpells(campaignId, { initialData: initialSpells });

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

      {spellsLoading && spells.length === 0 ? (
        <LoadingState rows={6} label="Завантаження заклинань…" />
      ) : spells.length === 0 ? (
        <EmptyState icon={Wand2} title="Ще немає заклинань" description="Створіть перше заклинання або імпортуйте їх з файлу." />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={sortedGroupedSpells.map(([groupName]) => groupName)}
          className="space-y-2 sm:space-y-4"
        >
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
