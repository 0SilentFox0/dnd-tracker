"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Заклинання героя</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 space-y-2 pr-2">
          {spells.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              Персонаж поки не знає жодного заклинання.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {spells
                .sort((a, b) => (a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name)))
                .map((spell) => (
                  <li
                    key={spell.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-muted/50 text-sm"
                  >
                    <span className="font-medium truncate">{spell.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      рівень {spell.level}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
