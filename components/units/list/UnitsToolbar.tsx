"use client";

import { Search } from "lucide-react";

import { HudChipTabs } from "@/components/hud/page";
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
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hud-muted" aria-hidden />
        <Input
          type="search"
          aria-label="Пошук юнітів"
          placeholder="Пошук за назвою"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <HudChipTabs
        ariaLabel="Фільтр за расою"
        items={chips.map((chip) => ({
          key: chip.key,
          active: selected.includes(chip.key),
          onSelect: () => onToggle(chip.key),
          label: (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-hud-muted" style={chip.color ? { backgroundColor: chip.color } : undefined} aria-hidden />
              {chip.label} · {chip.count}
            </span>
          ),
        }))}
      />
    </div>
  );
}
