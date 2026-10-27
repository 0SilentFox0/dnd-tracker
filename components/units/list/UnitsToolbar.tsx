"use client";

import { SearchInput } from "@/components/common/SearchInput";
import { HudChipTabs } from "@/components/hud/page";
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
      <SearchInput value={query} onChange={onSearch} label="Пошук юнітів" />
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
