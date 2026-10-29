"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { HudCard } from "@/components/hud/page";
import { SpellIcon } from "@/components/spells/SpellIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSpellLabels } from "@/lib/hooks/spells";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { Spell } from "@/types/spells";

interface SelectedSpellsListProps {
  selectedSpells: Spell[];
  onRemoveSpell: (spellId: string) => void;
}

export function SelectedSpellsList({
  selectedSpells,
  onRemoveSpell,
}: SelectedSpellsListProps) {
  const t = useTranslations("spells.selected");

  const tc = useTranslator("common");

  const labels = useSpellLabels();

  if (selectedSpells.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t("title")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {selectedSpells.map((spell) => {
          return (
            <HudCard key={spell.id} className="relative">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  <SpellIcon spell={spell} size={64} className="w-full h-full object-cover" iconClassName="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold truncate">
                      {spell.name}
                    </h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 hover:bg-transparent shrink-0"
                      onClick={() => onRemoveSpell(spell.id)}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {tc(`spellLevels.${spell.level}`)}
                    </Badge>
                    {labels.mechanics(spell).map((label) => (
                      <Badge key={label} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </HudCard>
          );
        })}
      </div>
    </div>
  );
}
