"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type { CharacterListItem } from "@/types/characters";

export function useCheckedIds(characters: CharacterListItem[]) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(characters.map((c) => c.id)));

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);

      if (!next.delete(id)) next.add(id);

      return next;
    });

  return { picked, toggle };
}

interface CharacterPickListProps {
  characters: CharacterListItem[];
  checked: ReturnType<typeof useCheckedIds>;
  suffix?: (c: CharacterListItem) => string;
}

export function CharacterPickList({ characters, checked, suffix }: CharacterPickListProps) {
  return (
    <ul className="space-y-1">
      {characters.map((c) => (
        <li key={c.id}>
          <label className="flex min-h-10 items-center gap-3 text-sm">
            <Checkbox aria-label={c.name} checked={checked.picked.has(c.id)} onCheckedChange={() => checked.toggle(c.id)} />
            {c.name}
            {suffix?.(c)}
          </label>
        </li>
      ))}
    </ul>
  );
}
