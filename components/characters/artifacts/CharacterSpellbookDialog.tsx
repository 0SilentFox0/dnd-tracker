"use client";

import { useMemo } from "react";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Spell } from "@/types/spells";

interface CharacterSpellbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spells: Spell[];
}

interface SpellsByGroup {
  groupName: string;
  spells: Spell[];
}

export function CharacterSpellbookDialog({
  open,
  onOpenChange,
  spells,
}: CharacterSpellbookDialogProps) {
  const groupedSpells = useMemo((): SpellsByGroup[] => {
    const groups = new Map<string, { name: string; spells: Spell[] }>();

    for (const spell of spells) {
      const groupId = spell.spellGroup?.id ?? "__none__";

      const groupName = spell.spellGroup?.name ?? "Інші заклинання";

      if (!groups.has(groupId)) {
        groups.set(groupId, { name: groupName, spells: [] });
      }

      groups.get(groupId)!.spells.push(spell);
    }

    // Сортуємо заклинання в кожній групі: за рівнем, потім за назвою
    for (const group of groups.values()) {
      group.spells.sort((a, b) =>
        a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name)
      );
    }

    // Групи з назвою першими, «Інші» в кінці
    return Array.from(groups.values())
      .map((g) => ({ groupName: g.name, spells: g.spells }))
      .sort((a, b) => {
        if (a.groupName === "Інші заклинання") return 1;

        if (b.groupName === "Інші заклинання") return -1;

        return a.groupName.localeCompare(b.groupName);
      });
  }, [spells]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Заклинання героя</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 pr-2">
          {spells.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              Персонаж поки не знає жодного заклинання. Вивчіть школу магії в
              дереві прокачки.
            </p>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="space-y-4">
                {groupedSpells.map((group) => (
                  <div key={group.groupName}>
                    <h3 className="text-sm font-semibold text-amber-400 mb-2">
                      {group.groupName}
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {group.spells.map((spell) => (
                        <Tooltip key={spell.id}>
                          <TooltipTrigger asChild>
                            <div className="relative aspect-square rounded-lg overflow-hidden border border-amber-900/40 bg-[#2a2520] cursor-pointer hover:border-amber-500/60 transition-colors">
                              {spell.icon ? (
                                <Image
                                  src={spell.icon}
                                  alt={spell.name}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full text-amber-600/60 text-xs text-center p-1 leading-tight">
                                  {spell.name}
                                </div>
                              )}
                              <div className="absolute bottom-0 right-0 bg-black/70 text-amber-400 text-[10px] px-1 rounded-tl">
                                {spell.level}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="font-medium">{spell.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Рівень {spell.level}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
