"use client";

import Link from "next/link";
import { Printer, Wand2 } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { CreateSpellGroupDialog } from "@/components/spells/dialogs/CreateSpellGroupDialog";
import { SpellGroupAccordion } from "@/components/spells/list/SpellGroupAccordion";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useSpellsList } from "@/lib/hooks/spells";
import { pluralUk } from "@/lib/utils/common/plural";
import type { Spell } from "@/types/spells";

interface DMSpellsPageClientProps {
  campaignId: string;
  initialSpells: Spell[];
}

export function DMSpellsPageClient({ campaignId, initialSpells }: DMSpellsPageClientProps) {
  const list = useSpellsList(campaignId, initialSpells);

  const count = list.spells.length;

  return (
    <HudPage>
      <HudPageHeader
        title="Заклинання"
        subtitle={`База заклинань кампанії · Всього: ${count}`}
        actions={
          <>
            <CreateSpellGroupDialog campaignId={campaignId} />
            <Button className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={`/campaigns/${campaignId}/dm/spells/new`}>+ Створити заклинання</Link>
            </Button>
            {count > 0 && (
              <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
                <Link href={`/campaigns/${campaignId}/dm/print/spells`} target="_blank" rel="noopener noreferrer">
                  <Printer className="h-4 w-4 mr-1" />
                  Версія для друку
                </Link>
              </Button>
            )}
            <DeleteAllButton
              count={count}
              nouns={["заклинання", "заклинання", "заклинань"]}
              confirm={{
                label: "Видалити всі заклинання",
                description: `Ви впевнені, що хочете видалити всі заклинання з кампанії? Ця дія незворотна. Буде видалено ${count} ${pluralUk(count, ["заклинання", "заклинання", "заклинань"])}.`,
              }}
              actions={{ onConfirm: list.actions.removeAll }}
            />
          </>
        }
      />

      {list.isLoading && count === 0 ? (
        <LoadingState rows={6} label="Завантаження заклинань…" />
      ) : count === 0 ? (
        <EmptyState icon={Wand2} title="Ще немає заклинань" description="Створіть перше заклинання або імпортуйте їх з файлу." />
      ) : (
        <Accordion type="multiple" defaultValue={list.view.groups.map(([groupName]) => groupName)} className="space-y-2">
          {list.view.groups.map(([groupName, levels]) => (
            <SpellGroupAccordion
              key={groupName}
              groupName={groupName}
              levels={levels}
              campaignId={campaignId}
              spellGroups={list.view.spellGroups}
              spellActions={{ onRemoveFromGroup: list.actions.removeFromGroup, onMoveToGroup: list.actions.moveToGroup }}
            />
          ))}
        </Accordion>
      )}
    </HudPage>
  );
}
