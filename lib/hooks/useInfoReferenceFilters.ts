"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { SectionTab, SkillForReference, SpellForReference } from "@/lib/types/info-reference";
import {
  matchSearch,
  skillSearchText,
  spellSearchText,
} from "@/lib/utils/info-reference";

export function useInfoReferenceFilters(skills: SkillForReference[], spells: SpellForReference[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [section, setSection] = useState<SectionTab>("all");
  const [mainSkillFilter, setMainSkillFilter] = useState<string | null>(null);
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | null>(null);
  const [spellGroupFilter, setSpellGroupFilter] = useState<string | null>(null);
  const [spellTypeFilter, setSpellTypeFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredSearch = useDeferredValue(searchQuery);

  const mainSkillOptions = useMemo(() => {
    const set = new Set<string>();
    skills.forEach((s) => {
      if (s.mainSkillName) set.add(s.mainSkillName);
    });
    return Array.from(set).sort();
  }, [skills]);

  const spellLevelOptions = useMemo(() => {
    const set = new Set<number>();
    spells.forEach((s) => set.add(s.level));
    return Array.from(set).sort((a, b) => a - b);
  }, [spells]);

  const spellGroupOptions = useMemo(() => {
    const set = new Set<string>();
    spells.forEach((s) => {
      if (s.groupName) set.add(s.groupName);
    });
    return Array.from(set).sort();
  }, [spells]);

  const spellTypeOptions = useMemo(() => {
    const set = new Set<string>();
    spells.forEach((s) => set.add(s.type));
    return Array.from(set).sort();
  }, [spells]);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      if (!matchSearch(skillSearchText(s), deferredSearch)) return false;
      if (mainSkillFilter && s.mainSkillName !== mainSkillFilter) return false;
      return true;
    });
  }, [skills, deferredSearch, mainSkillFilter]);

  const filteredSpells = useMemo(() => {
    return spells.filter((s) => {
      if (!matchSearch(spellSearchText(s), deferredSearch)) return false;
      if (spellLevelFilter != null && s.level !== spellLevelFilter) return false;
      if (spellGroupFilter && s.groupName !== spellGroupFilter) return false;
      if (spellTypeFilter && s.type !== spellTypeFilter) return false;
      return true;
    });
  }, [
    spells,
    deferredSearch,
    spellLevelFilter,
    spellGroupFilter,
    spellTypeFilter,
  ]);

  const hasActiveFilters =
    deferredSearch.trim() !== "" ||
    mainSkillFilter != null ||
    spellLevelFilter != null ||
    spellGroupFilter != null ||
    spellTypeFilter != null;

  const clearAllFilters = () => {
    setSearchQuery("");
    setMainSkillFilter(null);
    setSpellLevelFilter(null);
    setSpellGroupFilter(null);
    setSpellTypeFilter(null);
  };

  const showSkills = section === "all" || section === "skills";
  const showSpells = section === "all" || section === "spells";
  const skillsEmpty = showSkills && filteredSkills.length === 0;
  const spellsEmpty = showSpells && filteredSpells.length === 0;
  const nothingFound = skillsEmpty && spellsEmpty;

  return {
    searchQuery,
    setSearchQuery,
    section,
    setSection,
    mainSkillFilter,
    setMainSkillFilter,
    spellLevelFilter,
    setSpellLevelFilter,
    spellGroupFilter,
    setSpellGroupFilter,
    spellTypeFilter,
    setSpellTypeFilter,
    filtersOpen,
    setFiltersOpen,
    mainSkillOptions,
    spellLevelOptions,
    spellGroupOptions,
    spellTypeOptions,
    filteredSkills,
    filteredSpells,
    hasActiveFilters,
    clearAllFilters,
    showSkills,
    showSpells,
    skillsEmpty,
    spellsEmpty,
    nothingFound,
  };
}
