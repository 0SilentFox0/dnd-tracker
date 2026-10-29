"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { SelectedSpellsList } from "@/components/spells/list/SelectedSpellsList";
import { SpellDropdownContent } from "@/components/spells/SpellDropdownContent";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSpells, useSpellSelection } from "@/lib/hooks/spells";

interface SpellMultiSelectProps {
  campaignId: string;
  selectedSpellIds: string[];
  onSelectionChange: (spellIds: string[]) => void;
}

export function SpellMultiSelect({
  campaignId,
  selectedSpellIds,
  onSelectionChange,
}: SpellMultiSelectProps) {
  const t = useTranslations("characters.spells");

  const {
    data: spells = [],
    isLoading: spellsLoading,
    error: spellsError,
  } = useSpells(campaignId);

  const {
    open,
    setOpen,
    groupedSpells,
    selectedSpells,
    toggleSpell,
    removeSpell,
  } = useSpellSelection({
    spells,
    selectedSpellIds,
    onSelectionChange,
  });

  if (spellsError) {
    return (
      <div className="text-sm text-destructive">
        {t("loadError", { message: spellsError instanceof Error ? spellsError.message : t("unknownError") })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            type="button"
            disabled={spellsLoading}
          >
            <span>
              {spellsLoading
                ? t("loading")
                : selectedSpells.length === 0
                ? t("choose")
                : t("selected", { count: selectedSpells.length })}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <SpellDropdownContent
          groupedSpells={groupedSpells}
          selectedSpellIds={selectedSpellIds}
          isLoading={spellsLoading}
          onToggleSpell={toggleSpell}
        />
      </DropdownMenu>

      <SelectedSpellsList
        selectedSpells={selectedSpells}
        onRemoveSpell={removeSpell}
      />
    </div>
  );
}
