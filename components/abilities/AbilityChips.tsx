"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Ability } from "@/lib/utils/abilities/schema";

export function pickAfterRemove(ids: string[], removedIndex: number): string | null {
  return ids[removedIndex + 1] ?? ids[removedIndex - 1] ?? null;
}

interface AbilityChipsProps {
  abilities: Ability[];
  selectedId: string | null;
  invalidIds: Set<string>;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function AbilityChips({ abilities, selectedId, invalidIds, onSelect, onAdd }: AbilityChipsProps) {
  return (
    <div className="hud-scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1" role="tablist" aria-label="Вміння">
      {abilities.map((a) => {
        const on = a.id === selectedId;

        return (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(a.id)}
            className={cn(
              "flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] text-[#8f8473] shadow-[inset_0_0_0_1px_#4a3c2c]",
              on && "text-[#ffd9a8] shadow-[inset_0_0_0_1px_#e6c25a,0_0_8px_rgba(230,194,90,.3)]",
            )}
          >
            <span className="max-w-[10rem] truncate">{a.name || "Без назви"}</span>
            {invalidIds.has(a.id) && <span data-invalid-dot aria-label="є помилки" className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[#d0705c]" />}
          </button>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        onClick={onAdd}
        className="h-8 shrink-0 rounded-full px-3 text-[13px] text-[#ffd9a8] shadow-[inset_0_0_0_1px_#e6c25a] hover:bg-transparent hover:text-[#ffd9a8]"
      >
        + Вміння
      </Button>
    </div>
  );
}
