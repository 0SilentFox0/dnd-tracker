"use client";

import { useMemo } from "react";
import { Wand2 } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage } from "@/components/hud/page";
import { SpellGroupAccordion } from "@/components/spells/list/SpellGroupAccordion";
import { SpellsPageHeader } from "@/components/spells/ui/SpellsPageHeader";
import { Accordion } from "@/components/ui/accordion";
import { useConfirm } from "@/lib/hooks/common";
import {
  useDeleteAllSpells,
  useMoveSpellToGroup,
  useRemoveSpellFromGroup,
  useSpellGroups,
  useSpells,
} from "@/lib/hooks/spells";
import { pluralUk } from "@/lib/utils/plural";
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
  const confirm = useConfirm();

  const { data: spells = initialSpells, isLoading: spellsLoading } = useSpells(campaignId, { initialData: initialSpells });

  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  const removeSpellFromGroupMutation = useRemoveSpellFromGroup(campaignId);

  const moveSpellMutation = useMoveSpellToGroup(campaignId);

  const deleteAllSpellsMutation = useDeleteAllSpells(campaignId);

  const handleRemoveSpellFromGroup = (spellId: string) => {
    removeSpellFromGroupMutation.mutate(spellId);
  };

  const handleMoveSpellToGroup = (spellId: string, groupId: string | null) => {
    moveSpellMutation.mutate({ spellId, groupId });
  };

  const handleDeleteAllSpells = () =>
    confirm({
      title: "Видалити всі заклинання?",
      description: `Ви впевнені, що хочете видалити всі заклинання з кампанії? Ця дія незворотна. Буде видалено ${spells.length} ${pluralUk(spells.length, ["заклинання", "заклинання", "заклинань"])}.`,
      confirmLabel: "Видалити всі заклинання",
      destructive: true,
      onConfirm: () => deleteAllSpellsMutation.mutateAsync(),
    });

  const sortedGroupedSpells = useMemo(() => {
    const groupedSpellsMap = groupSpellsByGroupAndLevel(spells);

    return convertGroupedSpellsToArray(groupedSpellsMap);
  }, [spells]);

  return (
    <HudPage>
      <SpellsPageHeader
        campaignId={campaignId}
        spellsCount={spells.length}
        onDeleteAll={() => void handleDeleteAllSpells()}
      />

      {spellsLoading && spells.length === 0 ? (
        <LoadingState rows={6} label="Завантаження заклинань…" />
      ) : spells.length === 0 ? (
        <EmptyState icon={Wand2} title="Ще немає заклинань" description="Створіть перше заклинання або імпортуйте їх з файлу." />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={sortedGroupedSpells.map(([groupName]) => groupName)}
          className="space-y-2"
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
    </HudPage>
  );
}
