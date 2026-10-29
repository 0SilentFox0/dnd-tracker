"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { useTranslator } from "@/lib/i18n/use-translator";
import {
  artifactSearchText,
  classSearchText,
  matchSearch,
  skillSearchText,
  spellSearchText,
} from "@/lib/utils/campaigns/info-reference";
import type { ArtifactForReference, ClassForReference, ReferenceFilters, SectionTab, SkillForReference, SpellForReference } from "@/types/info-reference";

interface FilterValues {
  mainSkill: string | null;
  spellLevel: number | null;
  spellGroup: string | null;
  spellType: string | null;
  artifactRarity: string | null;
  artifactSlot: string | null;
  artifactSet: string | null;
}

const NO_FILTERS: FilterValues = {
  mainSkill: null,
  spellLevel: null,
  spellGroup: null,
  spellType: null,
  artifactRarity: null,
  artifactSlot: null,
  artifactSet: null,
};

function uniqueSorted<T, V extends string | number>(items: T[], pick: (item: T) => V | null | undefined, compare?: (a: V, b: V) => number): V[] {
  const values = new Set<V>();

  for (const item of items) {
    const value = pick(item);

    if (value !== null && value !== undefined && value !== "") values.add(value);
  }

  return [...values].sort(compare);
}

export function useInfoReferenceFilters(skills: SkillForReference[], spells: SpellForReference[], artifacts: ArtifactForReference[] = [], classes: ClassForReference[] | null = null) {
  const t = useTranslator();

  const classMode = classes !== null;

  const [searchQuery, setSearchQuery] = useState("");

  const [section, setSection] = useState<SectionTab>("all");

  const [values, setValues] = useState<FilterValues>(NO_FILTERS);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredSearch = useDeferredValue(searchQuery);

  const options = useMemo(() => {
    const slots = new Map(artifacts.map((a) => [a.slot, t(`artifacts.slots.${a.slot}`)]));

    return {
      mainSkill: uniqueSorted(skills, (s) => s.mainSkillName),
      spellLevel: uniqueSorted(spells, (s) => s.level, (a, b) => a - b),
      spellGroup: uniqueSorted(spells, (s) => s.groupName),
      spellType: uniqueSorted(spells, (s) => s.type),
      artifactRarity: uniqueSorted(artifacts, (a) => a.rarity),
      artifactSlot: Array.from(slots, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      artifactSet: uniqueSorted(artifacts, (a) => a.setName),
    };
  }, [skills, spells, artifacts, t]);

  const skillTexts = useMemo(() => new Map(skills.map((s) => [s.id, skillSearchText(s, t)])), [skills, t]);

  const spellTexts = useMemo(() => new Map(spells.map((s) => [s.id, spellSearchText(s, t)])), [spells, t]);

  const artifactTexts = useMemo(() => new Map(artifacts.map((a) => [a.id, artifactSearchText(a, t)])), [artifacts, t]);

  const classTexts = useMemo(() => new Map((classes ?? []).map((c) => [c.id, classSearchText(c, t)])), [classes, t]);

  const filteredSkills = useMemo(
    () => skills.filter((s) => matchSearch(skillTexts.get(s.id) ?? "", deferredSearch) && (!values.mainSkill || s.mainSkillName === values.mainSkill)),
    [skills, skillTexts, deferredSearch, values.mainSkill],
  );

  const filteredSpells = useMemo(
    () =>
      spells.filter(
        (s) =>
          matchSearch(spellTexts.get(s.id) ?? "", deferredSearch) &&
          (values.spellLevel == null || s.level === values.spellLevel) &&
          (!values.spellGroup || s.groupName === values.spellGroup) &&
          (!values.spellType || s.type === values.spellType),
      ),
    [spells, spellTexts, deferredSearch, values.spellLevel, values.spellGroup, values.spellType],
  );

  const filteredArtifacts = useMemo(
    () =>
      artifacts.filter(
        (a) =>
          matchSearch(artifactTexts.get(a.id) ?? "", deferredSearch) &&
          (!values.artifactRarity || a.rarity === values.artifactRarity) &&
          (!values.artifactSlot || a.slot === values.artifactSlot) &&
          (!values.artifactSet || a.setName === values.artifactSet),
      ),
    [artifacts, artifactTexts, deferredSearch, values.artifactRarity, values.artifactSlot, values.artifactSet],
  );

  const filteredClasses = useMemo(() => (classes ?? []).filter((c) => matchSearch(classTexts.get(c.id) ?? "", deferredSearch)), [classes, classTexts, deferredSearch]);

  const field = <K extends keyof FilterValues>(key: K) => ({
    value: values[key],
    set: (value: FilterValues[K] | null) => setValues((prev) => ({ ...prev, [key]: value })),
  });

  const hasActiveFilters = deferredSearch.trim() !== "" || Object.values(values).some((v) => v != null);

  const clearAllFilters = () => {
    setSearchQuery("");
    setValues(NO_FILTERS);
  };

  const showSkills = !classMode && (section === "all" || section === "skills");

  const showSpells = section === "all" || section === "spells";

  const showArtifacts = section === "all" || section === "artifacts";

  const showClasses = classMode && (section === "all" || section === "classes");

  const classesEmpty = showClasses && filteredClasses.length === 0;

  const skillsEmpty = showSkills && filteredSkills.length === 0;

  const spellsEmpty = showSpells && filteredSpells.length === 0;

  const artifactsEmpty = showArtifacts && filteredArtifacts.length === 0;

  const filters: ReferenceFilters = {
    search: { value: searchQuery, set: setSearchQuery },
    section: { value: section, set: setSection },
    panel: { open: filtersOpen, setOpen: setFiltersOpen },
    hasActive: hasActiveFilters,
    classMode,
    clearAll: clearAllFilters,
    visible: { skills: showSkills, spells: showSpells, artifacts: showArtifacts, classes: showClasses },
    skill: {
      mainSkill: { ...field("mainSkill"), options: options.mainSkill },
    },
    spell: {
      level: { ...field("spellLevel"), options: options.spellLevel },
      group: { ...field("spellGroup"), options: options.spellGroup },
      type: { ...field("spellType"), options: options.spellType },
    },
    artifact: {
      rarity: { ...field("artifactRarity"), options: options.artifactRarity },
      slot: { ...field("artifactSlot"), options: options.artifactSlot },
      artifactSet: { ...field("artifactSet"), options: options.artifactSet },
    },
  };

  return {
    filters,
    results: { filteredSkills, filteredSpells, filteredArtifacts, filteredClasses },
    ui: {
      shown: {
        skills: showSkills && !skillsEmpty,
        spells: showSpells && !spellsEmpty,
        artifacts: showArtifacts && !artifactsEmpty,
        classes: showClasses && !classesEmpty,
      },
      skillsEmpty,
      spellsEmpty,
      artifactsEmpty,
      classesEmpty,
      nothingFound: section === "all" && (!showSkills || skillsEmpty) && spellsEmpty && artifactsEmpty && (!showClasses || classesEmpty),
    },
  };
}
