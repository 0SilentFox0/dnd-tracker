"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";

import { SelectedSpellsList } from "@/components/spells/list/SelectedSpellsList";
import { SpellDropdownContent } from "@/components/spells/ui/SpellDropdownContent";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSpells, useSpellSelection } from "@/lib/hooks/spells";
import type { Spell } from "@/types/spells";

interface SpellMultiSelectProps {
  campaignId: string;
  selectedSpellIds: string[];
  onSelectionChange: (spellIds: string[]) => void;
  /** Обмежити список заклинань за полем `type` (наприклад лише `target`) */
  allowedSpellTypes?: Spell["type"][];
}

export function SpellMultiSelect({
  campaignId,
  selectedSpellIds,
  onSelectionChange,
  allowedSpellTypes,
}: SpellMultiSelectProps) {
  const {
    data: spells = [],
    isLoading: spellsLoading,
    error: spellsError,
  } = useSpells(campaignId);

  const spellsFiltered = useMemo(() => {
    if (!allowedSpellTypes?.length) return spells;

    const allow = new Set(allowedSpellTypes);

    return spells.filter((s) => allow.has(s.type));
  }, [spells, allowedSpellTypes]);

  const {
    open,
    setOpen,
    groupedSpells,
    selectedSpells,
    toggleSpell,
    removeSpell,
  } = useSpellSelection({
    spells: spellsFiltered,
    selectedSpellIds,
    onSelectionChange,
  });

  if (spellsError) {
    return (
      <div className="text-sm text-destructive">
        Помилка завантаження заклинань:{" "}
        {spellsError instanceof Error
          ? spellsError.message
          : "Невідома помилка"}
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
                ? "Завантаження..."
                : selectedSpells.length === 0
                ? "Виберіть заклинання"
                : `Обрано: ${selectedSpells.length}`}
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
