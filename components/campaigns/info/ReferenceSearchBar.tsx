"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SectionTab } from "@/lib/types/info-reference";
import { cn } from "@/lib/utils";

interface ReferenceSearchBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  section: SectionTab;
  setSection: (v: SectionTab) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  mainSkillFilter: string | null;
  setMainSkillFilter: (v: string | null) => void;
  spellLevelFilter: number | null;
  setSpellLevelFilter: (v: number | null) => void;
  spellGroupFilter: string | null;
  setSpellGroupFilter: (v: string | null) => void;
  spellTypeFilter: string | null;
  setSpellTypeFilter: (v: string | null) => void;
  mainSkillOptions: string[];
  spellLevelOptions: number[];
  spellGroupOptions: string[];
  spellTypeOptions: string[];
  showSkillsFilter: boolean;
  showSpellsFilter: boolean;
}

const SECTION_TABS: {
  value: SectionTab;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { value: "all", label: "Усі", icon: BookOpen },
  { value: "skills", label: "Скіли", icon: Sparkles },
  { value: "spells", label: "Заклинання", icon: Sparkles },
];

export function ReferenceSearchBar({
  searchQuery,
  setSearchQuery,
  section,
  setSection,
  filtersOpen,
  setFiltersOpen,
  hasActiveFilters,
  clearAllFilters,
  mainSkillFilter,
  setMainSkillFilter,
  spellLevelFilter,
  setSpellLevelFilter,
  spellGroupFilter,
  setSpellGroupFilter,
  spellTypeFilter,
  setSpellTypeFilter,
  mainSkillOptions,
  spellLevelOptions,
  spellGroupOptions,
  spellTypeOptions,
  showSkillsFilter,
  showSpellsFilter,
}: ReferenceSearchBarProps) {
  return (
    <HudPanel as="div" className="sticky top-0 z-10 bg-[rgba(17,14,11,.97)]">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-hud-muted" />
          <Input
            type="search"
            placeholder="Пошук за назвою, описом, механікою..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 min-h-11 md:min-h-10"
            aria-label="Пошук по скілах та заклинаннях"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-hud-muted hover:text-hud-ink"
              aria-label="Очистити пошук"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <HudChipTabs
          ariaLabel="Розділ довідника"
          items={SECTION_TABS.map(({ value, label, icon: Icon }) => ({
            key: value,
            label: (
              <span className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </span>
            ),
            active: section === value,
            onSelect: () => setSection(value),
          }))}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-3 py-2 text-sm text-hud-gold shadow-[inset_0_0_0_1px_var(--color-hud-line)] hover:shadow-[inset_0_0_0_1px_var(--color-hud-gold)] md:hidden"
          >
            <Filter className="h-4 w-4" />
            Фільтри
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                увімкнено
              </Badge>
            )}
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-hud-muted hover:text-hud-ink"
            >
              <X className="h-4 w-4 mr-1" />
              Скинути фільтри
            </Button>
          )}
        </div>

        <div
          className={cn(
            "grid gap-4 overflow-hidden transition-[grid-template-rows] duration-200 md:grid-rows-[1fr]",
            filtersOpen
              ? "grid-rows-[1fr]"
              : "grid-rows-[0fr] md:grid-rows-[1fr]",
          )}
        >
          <div className="min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4 items-end">
            {showSkillsFilter && mainSkillOptions.length > 0 && (
              <div className="space-y-1.5 w-full min-w-0">
                <Label className="text-xs text-hud-muted">
                  Гілка скілу
                </Label>
                <Select
                  value={mainSkillFilter ?? "all"}
                  onValueChange={(v) =>
                    setMainSkillFilter(v === "all" ? null : v)
                  }
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Усі гілки" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Усі гілки</SelectItem>
                    {mainSkillOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showSpellsFilter && spellLevelOptions.length > 0 && (
              <div className="space-y-1.5 w-full min-w-0">
                <Label className="text-xs text-hud-muted">
                  Рівень заклинання
                </Label>
                <Select
                  value={
                    spellLevelFilter != null ? String(spellLevelFilter) : "all"
                  }
                  onValueChange={(v) =>
                    setSpellLevelFilter(v === "all" ? null : Number(v))
                  }
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Будь-який" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Будь-який</SelectItem>
                    {spellLevelOptions.map((lvl) => (
                      <SelectItem key={lvl} value={String(lvl)}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showSpellsFilter && spellGroupOptions.length > 0 && (
              <div className="space-y-1.5 w-full min-w-0">
                <Label className="text-xs text-hud-muted">
                  Група заклинань
                </Label>
                <Select
                  value={spellGroupFilter ?? "all"}
                  onValueChange={(v) =>
                    setSpellGroupFilter(v === "all" ? null : v)
                  }
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Усі групи" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Усі групи</SelectItem>
                    {spellGroupOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showSpellsFilter && spellTypeOptions.length > 0 && (
              <div className="space-y-1.5 w-full min-w-0">
                <Label className="text-xs text-hud-muted">
                  Тип заклинання
                </Label>
                <Select
                  value={spellTypeFilter ?? "all"}
                  onValueChange={(v) =>
                    setSpellTypeFilter(v === "all" ? null : v)
                  }
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Усі типи" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Усі типи</SelectItem>
                    {spellTypeOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>
    </HudPanel>
  );
}
