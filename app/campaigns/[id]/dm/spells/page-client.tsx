"use client";

import Link from "next/link";
import { Printer, Wand2 } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { CreateSpellGroupDialog } from "@/components/spells/dialogs/CreateSpellGroupDialog";
import { SpellGroupAccordion } from "@/components/spells/list/SpellGroupAccordion";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useSpellsList } from "@/lib/hooks/spells";
import { pluralUk } from "@/lib/utils/common/plural";

export function DMSpellsPageClient({ campaignId }: { campaignId: string }) {
  const list = useSpellsList(campaignId);

  const count = list.spells.length;

  const groupNames = list.view.groups.map(([groupName]) => groupName);

  return (
    <HudPage>
      <HudPageHeader
        title="Заклинання"
        subtitle={`База заклинань кампанії · Всього: ${count}`}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="spells" />
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
      <OnboardingHint id="dm.spells" />
      {list.listFilter.tags.length > 0 && (
        <HudChipTabs
          ariaLabel="Список заклинань"
          items={[
            { key: "all", label: "Усі", active: list.listFilter.value === null, onSelect: () => list.listFilter.set(null) },
            ...list.listFilter.tags.map((tag) => ({ key: tag, label: tag, active: list.listFilter.value === tag, onSelect: () => list.listFilter.set(tag) })),
          ]}
        />
      )}

      {list.isLoading && count === 0 ? (
        <LoadingState rows={6} label="Завантаження заклинань…" />
      ) : count === 0 ? (
        <EmptyState icon={Wand2} title="Ще немає заклинань" description="Створіть перше заклинання або імпортуйте їх з файлу." />
      ) : (
        <>
          <SearchInput value={list.search.query.value} onChange={list.search.query.set} label="Пошук заклинань" />
          {list.view.groups.length === 0 ? (
            <SearchEmptyState query={list.search.query.value} onClear={() => list.search.query.set("")} />
          ) : (
            <Accordion
              key={list.search.isActive ? groupNames.join("|") : "all"}
              type="multiple"
              defaultValue={groupNames}
              className="space-y-2"
            >
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
        </>
      )}
    </HudPage>
  );
}
