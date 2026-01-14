"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { getSpellGroupIcon } from "@/lib/utils/spell-icons";
import type { Spell } from "@/lib/api/spells";

interface SelectedSpellsListProps {
  selectedSpells: Spell[];
  onRemoveSpell: (spellId: string) => void;
}

export function SelectedSpellsList({
  selectedSpells,
  onRemoveSpell,
}: SelectedSpellsListProps) {
  if (selectedSpells.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Вибрані заклинання:</p>
      <div className="flex flex-wrap gap-2">
        {selectedSpells.map((spell) => {
          const GroupIcon = getSpellGroupIcon(
            spell.spellGroup?.name || "Без групи"
          );
          return (
            <Badge
              key={spell.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <GroupIcon className="h-3 w-3" />
              <span className="text-xs">
                {spell.level === 0 ? "C" : spell.level} - {spell.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onRemoveSpell(spell.id)}
                type="button"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
