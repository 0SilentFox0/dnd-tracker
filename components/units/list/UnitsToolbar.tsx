"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { UnitRaceChip } from "@/lib/utils/units/group-units";

interface UnitsToolbarProps {
  query: string;
  onSearch: (query: string) => void;
  chips: UnitRaceChip[];
  selected: string[];
  onToggle: (key: string) => void;
}

export function UnitsToolbar({ query, onSearch, chips, selected, onToggle }: UnitsToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Пошук юнітів"
          placeholder="Пошук за назвою"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = selected.includes(chip.key);

          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(chip.key)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" style={chip.color ? { backgroundColor: chip.color } : undefined} aria-hidden />
              {chip.label} · {chip.count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
