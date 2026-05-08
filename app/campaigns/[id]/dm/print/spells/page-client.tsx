"use client";

import { useMemo } from "react";
import { Printer } from "lucide-react";

import { SpellCard } from "@/components/spells/list/SpellCard";
import { Button } from "@/components/ui/button";
import {
  convertGroupedSpellsToArray,
  groupSpellsByGroupAndLevel,
} from "@/lib/utils/spells/spells";
import type { Spell, SpellGroup } from "@/types/spells";

interface PrintSpellsPageClientProps {
  campaignId: string;
  campaignName: string;
  initialSpells: Spell[];
  spellGroups: SpellGroup[];
}

const noopRemove = () => {};

const noopMove = () => {};

export function PrintSpellsPageClient({
  campaignId,
  campaignName,
  initialSpells,
  spellGroups,
}: PrintSpellsPageClientProps) {
  const groupedSpells = useMemo(() => {
    const map = groupSpellsByGroupAndLevel(initialSpells);

    return convertGroupedSpellsToArray(map);
  }, [initialSpells]);

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">
            Кампанія «{campaignName}» — Заклинання
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Версія для друку. Натисніть Cmd/Ctrl+P щоб зберегти PDF.
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="shrink-0"
        >
          <Printer className="h-4 w-4 mr-2" />
          Друкувати
        </Button>
      </div>

      <header className="mb-6 hidden print:block">
        <h1 className="text-2xl font-bold">
          Кампанія «{campaignName}» — Заклинання
        </h1>
      </header>

      {groupedSpells.length === 0 ? (
        <p className="text-muted-foreground">
          У кампанії немає заклинань для друку.
        </p>
      ) : (
        groupedSpells.map(([groupName, levels]) => {
          const totalSpells = levels.reduce(
            (sum, [, spells]) => sum + spells.length,
            0,
          );

          return (
            <section key={groupName} className="print-section mb-8">
              <div className="flex items-baseline gap-3 py-3 border-b mb-4">
                <h2 className="text-xl font-semibold">{groupName}</h2>
                <span className="text-sm text-muted-foreground">
                  {totalSpells} закл.
                </span>
              </div>

              {levels.map(([levelLabel, levelSpells]) => (
                <div key={levelLabel} className="mb-6">
                  <h3 className="text-base font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
                    {levelLabel}
                    <span className="ml-2 text-xs font-normal">
                      ({levelSpells.length})
                    </span>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {levelSpells.map((spell) => (
                      <div key={spell.id} className="print-card">
                        <SpellCard
                          spell={spell}
                          campaignId={campaignId}
                          spellGroups={spellGroups}
                          onRemoveFromGroup={noopRemove}
                          onMoveToGroup={noopMove}
                          printMode
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
