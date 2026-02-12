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

const SECTION_TABS: { value: SectionTab; label: string; icon: typeof BookOpen }[] = [
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
    <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-b shadow-sm md:mx-0 md:rounded-lg md:border md:p-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded"
              aria-label="Очистити пошук"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {SECTION_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSection(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors min-h-11 touch-manipulation md:min-h-9",
                section === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted/50 border-input"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="md:hidden inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm min-h-11 touch-manipulation bg-muted/50 hover:bg-muted border-input"
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
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Скинути фільтри
            </Button>
          )}
        </div>

        <div
          className={cn(
            "grid gap-4 overflow-hidden transition-[grid-template-rows] duration-200 md:grid-rows-[1fr]",
            filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] md:grid-rows-[1fr]"
          )}
        >
          <div className="min-h-0 space-y-4 md:flex md:flex-wrap md:items-end md:gap-4 items-start">
            {showSkillsFilter && mainSkillOptions.length > 0 && (
              <div className="space-y-1.5 w-full md:w-auto md:min-w-[180px]">
                <Label className="text-xs text-muted-foreground">
                  Гілка скілу
                </Label>
                <Select
                  value={mainSkillFilter ?? "all"}
                  onValueChange={(v) => setMainSkillFilter(v === "all" ? null : v)}
                >
                  <SelectTrigger className="w-full min-h-11 md:min-h-9">
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
            {showSpellsFilter && (
              <>
                {spellLevelOptions.length > 0 && (
                  <div className="space-y-1.5 w-full md:w-auto md:min-w-[120px]">
                    <Label className="text-xs text-muted-foreground">
                      Рівень заклинання
                    </Label>
                    <Select
                      value={
                        spellLevelFilter != null
                          ? String(spellLevelFilter)
                          : "all"
                      }
                      onValueChange={(v) =>
                        setSpellLevelFilter(v === "all" ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="w-full min-h-11 md:min-h-9">
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
                {spellGroupOptions.length > 0 && (
                  <div className="space-y-1.5 w-full md:w-auto md:min-w-[180px]">
                    <Label className="text-xs text-muted-foreground">
                      Група заклинань
                    </Label>
                    <Select
                      value={spellGroupFilter ?? "all"}
                      onValueChange={(v) =>
                        setSpellGroupFilter(v === "all" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-full min-h-11 md:min-h-9">
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
                {spellTypeOptions.length > 0 && (
                  <div className="space-y-1.5 w-full md:w-auto md:min-w-[160px]">
                    <Label className="text-xs text-muted-foreground">
                      Тип заклинання
                    </Label>
                    <Select
                      value={spellTypeFilter ?? "all"}
                      onValueChange={(v) =>
                        setSpellTypeFilter(v === "all" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-full min-h-11 md:min-h-9">
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
