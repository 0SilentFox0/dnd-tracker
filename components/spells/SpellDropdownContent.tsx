"use client";

import {
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { getSpellGroupIcon } from "@/lib/utils/spell-icons";
import type { Spell } from "@/lib/api/spells";

interface SpellDropdownContentProps {
  groupedSpells: [string, Spell[]][];
  selectedSpellIds: string[];
  isLoading: boolean;
  onToggleSpell: (spellId: string) => void;
}

export function SpellDropdownContent({
  groupedSpells,
  selectedSpellIds,
  isLoading,
  onToggleSpell,
}: SpellDropdownContentProps) {
  if (isLoading) {
    return (
      <DropdownMenuContent
        className="w-[min(400px,calc(100vw-2rem))] max-h-[500px] overflow-y-auto"
        align="start"
        sideOffset={4}
      >
        <DropdownMenuLabel>Завантаження заклинань...</DropdownMenuLabel>
      </DropdownMenuContent>
    );
  }

  if (groupedSpells.length === 0) {
    return (
      <DropdownMenuContent
        className="w-[min(400px,calc(100vw-2rem))] max-h-[500px] overflow-y-auto"
        align="start"
        sideOffset={4}
      >
        <DropdownMenuLabel>
          Заклинання не знайдено. Додайте заклинання в бібліотеку кампанії.
        </DropdownMenuLabel>
      </DropdownMenuContent>
    );
  }

  return (
    <DropdownMenuContent
      className="w-[min(400px,calc(100vw-2rem))] max-h-[500px] overflow-y-auto"
      align="start"
      sideOffset={4}
    >
      {groupedSpells.map(([groupName, groupSpells]) => {
        const GroupIcon = getSpellGroupIcon(groupName);
        return (
          <div key={groupName}>
            <DropdownMenuLabel className="flex items-center gap-2 sticky top-0 bg-background z-10 py-2 min-w-0">
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{groupName}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {groupSpells.map((spell) => {
              const isSelected = selectedSpellIds.includes(spell.id);
              return (
                <DropdownMenuCheckboxItem
                  key={spell.id}
                  checked={isSelected}
                  onCheckedChange={() => onToggleSpell(spell.id)}
                  className="max-w-full"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 max-w-full">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {spell.level === 0 ? "C" : spell.level}
                    </span>
                    <span className="truncate min-w-0">{spell.name}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              );
            })}
          </div>
        );
      })}
    </DropdownMenuContent>
  );
}
