"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { SpellRichOptionData } from "@/components/spells/SpellRichOption";
import { SpellRichOption } from "@/components/spells/SpellRichOption";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Spell } from "@/types/spells";

interface CharacterSpellbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spells: Spell[];
}

export function CharacterSpellbookDialog({
  open,
  onOpenChange,
  spells,
}: CharacterSpellbookDialogProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set());

  const groupedSpells = (() => {
    const map = new Map<string, SpellRichOptionData[]>();

    for (const spell of spells) {
      const groupName = spell.spellGroup?.name ?? "Інші заклинання";

      if (!map.has(groupName)) map.set(groupName, []);

      map.get(groupName)!.push(spell as SpellRichOptionData);
    }

    for (const groupSpells of map.values()) {
      groupSpells.sort((a, b) =>
        a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name)
      );
    }

    // «Інші» в кінці
    return new Map(
      [...map.entries()].sort(([a], [b]) => {
        if (a === "Інші заклинання") return 1;

        if (b === "Інші заклинання") return -1;

        return a.localeCompare(b);
      })
    );
  })();

  const handleIconError = (spellId: string) => {
    setIconErrors((prev) => new Set(prev).add(spellId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col">
        <DialogHeader>
          <DialogTitle>Заклинання героя</DialogTitle>
        </DialogHeader>
        {spells.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">
            Персонаж поки не знає жодного заклинання. Вивчіть школу магії в
            дереві прокачки.
          </p>
        ) : (
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal"
              >
                <span>Заклинання ({spells.length})</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[min(420px,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto p-1"
            >
              {Array.from(groupedSpells.entries()).map(
                ([groupName, groupSpells]) => (
                  <div key={groupName}>
                    <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                      {groupName}
                    </div>
                    {groupSpells.map((spell) => (
                      <div
                        key={spell.id}
                        className="rounded-md px-1 py-0.5"
                      >
                        <SpellRichOption
                          spell={spell}
                          iconError={iconErrors.has(spell.id)}
                          onIconError={
                            spell.icon
                              ? () => handleIconError(spell.id)
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </DialogContent>
    </Dialog>
  );
}
