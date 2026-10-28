"use client";

import { SearchInput } from "@/components/common/SearchInput";
import { HudChipTabs } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import type { UnitRaceChip } from "@/lib/utils/units/group-units";

interface UnitsToolbarProps {
  query: string;
  onSearch: (query: string) => void;
  chips: UnitRaceChip[];
  selected: string[];
  onToggle: (key: string) => void;
  hideEmpty: { value: boolean; onToggle: () => void };
}

export function UnitsToolbar({ query, onSearch, chips, selected, onToggle, hideEmpty }: UnitsToolbarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchInput value={query} onChange={onSearch} label="Пошук юнітів" />
        </div>
        <Button type="button" variant={hideEmpty.value ? "default" : "outline"} className="whitespace-nowrap text-xs sm:text-sm" aria-pressed={hideEmpty.value} onClick={hideEmpty.onToggle}>
          {hideEmpty.value ? "Показати пусті групи" : "Сховати пусті групи"}
        </Button>
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
