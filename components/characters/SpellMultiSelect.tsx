"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useSpells } from "@/lib/hooks/useSpells";
import { useSpellSelection } from "@/lib/hooks/useSpellSelection";
import { SpellDropdownContent } from "@/components/spells/SpellDropdownContent";
import { SelectedSpellsList } from "@/components/spells/SelectedSpellsList";

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
