"use client";

import { useDeferredValue, useMemo, useState } from "react";

import {
  artifactSearchText,
  matchSearch,
  skillSearchText,
  spellSearchText,
} from "@/lib/utils/campaigns/info-reference";
import type { ArtifactForReference, ReferenceFilters, SectionTab, SkillForReference, SpellForReference } from "@/types/info-reference";

export function useInfoReferenceFilters(skills: SkillForReference[], spells: SpellForReference[], artifacts: ArtifactForReference[] = []) {
  const [searchQuery, setSearchQuery] = useState("");

  const [section, setSection] = useState<SectionTab>("all");

  const [mainSkillFilter, setMainSkillFilter] = useState<string | null>(null);

  const [spellLevelFilter, setSpellLevelFilter] = useState<number | null>(null);

  const [spellGroupFilter, setSpellGroupFilter] = useState<string | null>(null);

  const [spellTypeFilter, setSpellTypeFilter] = useState<string | null>(null);

  const [artifactRarityFilter, setArtifactRarityFilter] = useState<string | null>(null);

  const [artifactSlotFilter, setArtifactSlotFilter] = useState<string | null>(null);

  const [artifactSetFilter, setArtifactSetFilter] = useState<string | null>(null);

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

  const artifactRarityOptions = useMemo(() => {
    const set = new Set<string>();

    artifacts.forEach((a) => {
      if (a.rarity) set.add(a.rarity);
    });

    return Array.from(set).sort();
  }, [artifacts]);

  const artifactSlotOptions = useMemo(() => {
    const map = new Map<string, string>();

    artifacts.forEach((a) => map.set(a.slot, a.slotLabel));

    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [artifacts]);

  const artifactSetOptions = useMemo(() => {
    const set = new Set<string>();

    artifacts.forEach((a) => {
      if (a.setName) set.add(a.setName);
    });

    return Array.from(set).sort();
  }, [artifacts]);

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

  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((a) => {
      if (!matchSearch(artifactSearchText(a), deferredSearch)) return false;

      if (artifactRarityFilter && a.rarity !== artifactRarityFilter) return false;

      if (artifactSlotFilter && a.slot !== artifactSlotFilter) return false;

      if (artifactSetFilter && a.setName !== artifactSetFilter) return false;

      return true;
    });
  }, [artifacts, deferredSearch, artifactRarityFilter, artifactSlotFilter, artifactSetFilter]);

  const hasActiveFilters =
    deferredSearch.trim() !== "" ||
    mainSkillFilter != null ||
    spellLevelFilter != null ||
    spellGroupFilter != null ||
    spellTypeFilter != null ||
    artifactRarityFilter != null ||
    artifactSlotFilter != null ||
    artifactSetFilter != null;

  const clearAllFilters = () => {
    setSearchQuery("");
    setMainSkillFilter(null);
    setSpellLevelFilter(null);
    setSpellGroupFilter(null);
    setSpellTypeFilter(null);
    setArtifactRarityFilter(null);
    setArtifactSlotFilter(null);
    setArtifactSetFilter(null);
  };

  const showSkills = section === "all" || section === "skills";

  const showSpells = section === "all" || section === "spells";

  const showArtifacts = section === "all" || section === "artifacts";

  const skillsEmpty = showSkills && filteredSkills.length === 0;

  const spellsEmpty = showSpells && filteredSpells.length === 0;

  const artifactsEmpty = showArtifacts && filteredArtifacts.length === 0;

  const nothingFound = skillsEmpty && spellsEmpty && artifactsEmpty;

  const filters: ReferenceFilters = {
    search: { value: searchQuery, set: setSearchQuery },
    section: { value: section, set: setSection },
    panel: { open: filtersOpen, setOpen: setFiltersOpen },
    hasActive: hasActiveFilters,
    clearAll: clearAllFilters,
    visible: { skills: showSkills, spells: showSpells, artifacts: showArtifacts },
    skill: {
      mainSkill: { value: mainSkillFilter, set: setMainSkillFilter, options: mainSkillOptions },
    },
    spell: {
      level: { value: spellLevelFilter, set: setSpellLevelFilter, options: spellLevelOptions },
      group: { value: spellGroupFilter, set: setSpellGroupFilter, options: spellGroupOptions },
      type: { value: spellTypeFilter, set: setSpellTypeFilter, options: spellTypeOptions },
    },
    artifact: {
      rarity: { value: artifactRarityFilter, set: setArtifactRarityFilter, options: artifactRarityOptions },
      slot: { value: artifactSlotFilter, set: setArtifactSlotFilter, options: artifactSlotOptions },
      artifactSet: { value: artifactSetFilter, set: setArtifactSetFilter, options: artifactSetOptions },
    },
  };

  return {
    filters,
    results: {
      filteredSkills,
      filteredSpells,
      filteredArtifacts,
    },
    ui: {
      shown: {
        skills: showSkills && !skillsEmpty,
        spells: showSpells && !spellsEmpty,
        artifacts: showArtifacts && !artifactsEmpty,
      },
      skillsEmpty,
      spellsEmpty,
      artifactsEmpty,
      nothingFound,
    },
  };
}
