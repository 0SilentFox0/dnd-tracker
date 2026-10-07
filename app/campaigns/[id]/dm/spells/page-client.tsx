"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Printer, Wand2 } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { CreateSpellGroupDialog } from "@/components/skills/dialogs/CreateSpellGroupDialog";
import { SpellImportDialog } from "@/components/spells/dialogs/SpellImportDialog";
import { SpellGroupAccordion } from "@/components/spells/list/SpellGroupAccordion";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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

  // Групуємо заклинання спочатку по групах, потім по рівнях
  const sortedGroupedSpells = useMemo(() => {
    const groupedSpellsMap = groupSpellsByGroupAndLevel(spells);

    return convertGroupedSpellsToArray(groupedSpellsMap);
  }, [spells]);

  return (
    <HudPage>
      <HudPageHeader
        title="Заклинання"
        subtitle={`База заклинань кампанії Всього: ${spells.length}`}
        actions={
          <>
            <SpellImportDialog campaignId={campaignId} />
            <CreateSpellGroupDialog campaignId={campaignId} />
            <Link href={`/campaigns/${campaignId}/dm/spells/new`}>
              <Button className="whitespace-nowrap text-xs sm:text-sm">+ Створити заклинання</Button>
            </Link>
            {spells.length > 0 && (
              <Link href={`/campaigns/${campaignId}/dm/print/spells`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm">
                  <Printer className="h-4 w-4 mr-1" />
                  Версія для друку
                </Button>
              </Link>
            )}
            <DeleteAllButton
              count={spells.length}
              nouns={["заклинання", "заклинання", "заклинань"]}
              label="Видалити всі заклинання"
              description={`Ви впевнені, що хочете видалити всі заклинання з кампанії? Ця дія незворотна. Буде видалено ${spells.length} ${pluralUk(spells.length, ["заклинання", "заклинання", "заклинань"])}.`}
              onConfirm={() => deleteAllSpellsMutation.mutateAsync()}
            />
          </>
        }
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
