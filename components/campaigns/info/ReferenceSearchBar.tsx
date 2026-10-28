"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Filter,
  Gem,
  GraduationCap,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { artifactRarityLabel } from "@/lib/constants/artifacts";
import { cn } from "@/lib/utils";
import type { ReferenceFilters, SectionTab } from "@/types/info-reference";

interface ReferenceSearchBarProps {
  filters: ReferenceFilters;
}

interface FilterSelectProps {
  label: string;
  allLabel: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, allLabel, value, onChange, options }: FilterSelectProps) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-1.5 w-full min-w-0">
      <Label className="text-xs text-hud-muted">{label}</Label>
      <SelectField
        value={value ?? ""}
        onValueChange={(v) => onChange(v || null)}
        options={options}
        placeholder={allLabel}
        allowNone
        noneLabel={allLabel}
        noneValue="all"
        triggerClassName="w-full h-10"
      />
    </div>
  );
}

const asOptions = (values: (string | number)[]) =>
  values.map((v) => ({ value: String(v), label: String(v) }));

function SkillFilters({ filter }: { filter: ReferenceFilters["skill"] }) {
  return (
    <FilterSelect
      label="Гілка скілу"
      allLabel="Усі гілки"
      value={filter.mainSkill.value}
      onChange={filter.mainSkill.set}
      options={asOptions(filter.mainSkill.options)}
    />
  );
}

function SpellFilters({ filter }: { filter: ReferenceFilters["spell"] }) {
  const { level, group, type } = filter;

  return (
    <>
      <FilterSelect
        label="Рівень заклинання"
        allLabel="Будь-який"
        value={level.value != null ? String(level.value) : null}
        onChange={(v) => level.set(v == null ? null : Number(v))}
        options={asOptions(level.options)}
      />
      <FilterSelect
        label="Група заклинань"
        allLabel="Усі групи"
        value={group.value}
        onChange={group.set}
        options={asOptions(group.options)}
      />
      <FilterSelect
        label="Тип заклинання"
        allLabel="Усі типи"
        value={type.value}
        onChange={type.set}
        options={asOptions(type.options)}
      />
    </>
  );
}

function ArtifactFilters({ filter }: { filter: ReferenceFilters["artifact"] }) {
  const { rarity, slot, artifactSet } = filter;

  return (
    <>
      <FilterSelect
        label="Рідкість артефакту"
        allLabel="Будь-яка"
        value={rarity.value}
        onChange={rarity.set}
        options={rarity.options.map((r) => ({ value: r, label: artifactRarityLabel(r) }))}
      />
      <FilterSelect
        label="Слот артефакту"
        allLabel="Усі слоти"
        value={slot.value}
        onChange={slot.set}
        options={slot.options}
      />
      <FilterSelect
        label="Сет артефакту"
        allLabel="Усі сети"
        value={artifactSet.value}
        onChange={artifactSet.set}
        options={asOptions(artifactSet.options)}
      />
    </>
  );
}

const SECTION_TABS: {
  value: SectionTab;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { value: "all", label: "Усі", icon: BookOpen },
  { value: "skills", label: "Скіли", icon: Sparkles },
  { value: "classes", label: "Класи", icon: GraduationCap },
  { value: "spells", label: "Заклинання", icon: Sparkles },
  { value: "artifacts", label: "Артефакти", icon: Gem },
];

export function ReferenceSearchBar({ filters }: ReferenceSearchBarProps) {
  const { search, section, panel, hasActive, clearAll, visible, classMode } = filters;

  return (
    <HudPanel as="div" className="sticky top-0 z-10 bg-[rgba(17,14,11,.97)]">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-hud-muted" />
          <Input
            type="search"
            placeholder="Пошук за назвою, описом, механікою..."
            value={search.value}
            onChange={(e) => search.set(e.target.value)}
            className="pl-9 min-h-11 md:min-h-10"
            aria-label={classMode ? "Пошук по класах, заклинаннях та артефактах" : "Пошук по скілах, заклинаннях та артефактах"}
          />
          {search.value && (
            <button
              type="button"
              onClick={() => search.set("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-hud-muted hover:text-hud-ink"
              aria-label="Очистити пошук"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <HudChipTabs
          ariaLabel="Розділ довідника"
          items={SECTION_TABS.filter(({ value }) => (value === "skills" ? !classMode : value !== "classes" || classMode)).map(({ value, label, icon: Icon }) => ({
            key: value,
            label: (
              <span className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </span>
            ),
            active: section.value === value,
            onSelect: () => section.set(value),
          }))}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => panel.setOpen((o) => !o)}
            className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-3 py-2 text-sm text-hud-gold shadow-[inset_0_0_0_1px_var(--color-hud-line)] hover:shadow-[inset_0_0_0_1px_var(--color-hud-gold)] md:hidden"
          >
            <Filter className="h-4 w-4" />
            Фільтри
            {hasActive && (
              <Badge variant="secondary" className="text-xs">
                увімкнено
              </Badge>
            )}
            {panel.open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {hasActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
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
            panel.open
              ? "grid-rows-[1fr]"
              : "grid-rows-[0fr] md:grid-rows-[1fr]",
          )}
        >
          <div className="min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4 items-end">
            {visible.skills && <SkillFilters filter={filters.skill} />}
            {visible.spells && <SpellFilters filter={filters.spell} />}
            {visible.artifacts && <ArtifactFilters filter={filters.artifact} />}
          </div>
        </div>
      </div>
    </HudPanel>
  );
}
