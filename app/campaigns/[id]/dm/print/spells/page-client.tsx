"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";

import { SpellCard } from "@/components/spells/list/SpellCard";
import { Button } from "@/components/ui/button";
import { groupDisplayName } from "@/lib/constants/ungrouped";
import { useTranslator } from "@/lib/i18n/use-translator";
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
  const t = useTranslations("spells.print");

  const tg = useTranslator("gameTerms");

  const groupedSpells = useMemo(() => convertGroupedSpellsToArray(groupSpellsByGroupAndLevel(initialSpells)), [initialSpells]);

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">
            {t("title", { campaignName })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("hint")}
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="shrink-0"
        >
          <Printer className="h-4 w-4 mr-2" />
          {t("button")}
        </Button>
      </div>

      <header className="mb-6 hidden print:block">
        <h1 className="text-2xl font-bold">
          {t("title", { campaignName })}
        </h1>
      </header>

      {groupedSpells.length === 0 ? (
        <p className="text-muted-foreground">
          {t("empty")}
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
                <h2 className="text-xl font-semibold">{groupDisplayName(groupName, tg("ungrouped.spellGroup"))}</h2>
                <span className="text-sm text-muted-foreground">
                  {t("count", { count: totalSpells })}
                </span>
              </div>

              {levels.map(([level, levelSpells]) => (
                <div key={level} className="mb-6">
                  <h3 className="text-base font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
                    {tg(`spellLevels.${level}`)}
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
