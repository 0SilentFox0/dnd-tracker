"use client";

import { ReferenceSearchBar } from "./ReferenceSearchBar";
import { ReferenceSectionAccordion } from "./ReferenceSectionAccordion";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useInfoReferenceFilters } from "@/lib/hooks/common";
import type { ArtifactForReference, ArtifactSetForReference, SkillForReference, SpellForReference } from "@/types/info-reference";

export interface InfoReferenceClientProps {
  campaignId: string;
  skills: SkillForReference[];
  spells: SpellForReference[];
  artifacts: ArtifactForReference[];
  artifactSets: ArtifactSetForReference[];
  isDM: boolean;
}

export function InfoReferenceClient({
  campaignId,
  skills,
  spells,
  artifacts,
  artifactSets,
  isDM,
}: InfoReferenceClientProps) {
  const filters = useInfoReferenceFilters(skills, spells, artifacts);

  return (
    <div className="space-y-3">
      <ReferenceSearchBar
        searchQuery={filters.filters.searchQuery}
        setSearchQuery={filters.filters.setSearchQuery}
        section={filters.filters.section}
        setSection={filters.filters.setSection}
        filtersOpen={filters.filters.open}
        setFiltersOpen={filters.filters.setOpen}
        hasActiveFilters={filters.results.hasActiveFilters}
        clearAllFilters={filters.results.clearAllFilters}
        mainSkillFilter={filters.filters.mainSkillFilter}
        setMainSkillFilter={filters.filters.setMainSkillFilter}
        spellLevelFilter={filters.filters.spellLevelFilter}
        setSpellLevelFilter={filters.filters.setSpellLevelFilter}
        spellGroupFilter={filters.filters.spellGroupFilter}
        setSpellGroupFilter={filters.filters.setSpellGroupFilter}
        spellTypeFilter={filters.filters.spellTypeFilter}
        setSpellTypeFilter={filters.filters.setSpellTypeFilter}
        mainSkillOptions={filters.options.mainSkill}
        spellLevelOptions={filters.options.spellLevel}
        spellGroupOptions={filters.options.spellGroup}
        spellTypeOptions={filters.options.spellType}
        artifactRarityFilter={filters.filters.artifactRarityFilter}
        setArtifactRarityFilter={filters.filters.setArtifactRarityFilter}
        artifactSlotFilter={filters.filters.artifactSlotFilter}
        setArtifactSlotFilter={filters.filters.setArtifactSlotFilter}
        artifactSetFilter={filters.filters.artifactSetFilter}
        setArtifactSetFilter={filters.filters.setArtifactSetFilter}
        artifactRarityOptions={filters.options.artifactRarity}
        artifactSlotOptions={filters.options.artifactSlot}
        artifactSetOptions={filters.options.artifactSet}
        showArtifactsFilter={filters.ui.showArtifacts}
        showSkillsFilter={filters.filters.section === "all" || filters.filters.section === "skills"}
        showSpellsFilter={filters.filters.section === "all" || filters.filters.section === "spells"}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-hud-panel px-3 py-2 text-sm text-hud-muted">
        {filters.filters.section === "all" && (
          <>
            <span>
              Скілів:{" "}
              <strong className="text-hud-ink">
                {filters.results.filteredSkills.length}
              </strong>
            </span>
            <span>
              Заклинань:{" "}
              <strong className="text-hud-ink">
                {filters.results.filteredSpells.length}
              </strong>
            </span>
            <span>
              Артефактів:{" "}
              <strong className="text-hud-ink">
                {filters.results.filteredArtifacts.length}
              </strong>
            </span>
            {!filters.ui.skillsEmpty && (
              <a
                href="#ref-skills"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-[#e6c25a] hover:underline"
              >
                До скілів
              </a>
            )}
            {!filters.ui.spellsEmpty && (
              <a
                href="#ref-spells"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-[#e6c25a] hover:underline"
              >
                До заклинань
              </a>
            )}
            {!filters.ui.artifactsEmpty && (
              <a
                href="#ref-artifacts"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-[#e6c25a] hover:underline"
              >
                До артефактів
              </a>
            )}
          </>
        )}
        {filters.filters.section === "skills" && (
          <>
            Показано скілів:{" "}
            <strong className="text-hud-ink">
                {filters.results.filteredSkills.length}
              </strong>
          </>
        )}
        {filters.filters.section === "artifacts" && (
          <>
            Показано артефактів:{" "}
            <strong className="text-hud-ink">
                {filters.results.filteredArtifacts.length}
              </strong>
          </>
        )}
        {filters.filters.section === "spells" && (
          <>
            Показано заклинань:{" "}
            <strong className="text-hud-ink">
                {filters.results.filteredSpells.length}
              </strong>
          </>
        )}
      </div>

      {filters.ui.nothingFound && (
        <EmptyState
          className="bg-hud-panel"
          title="Нічого не знайдено"
          description="Змініть пошук або фільтри, або скиньте їх."
          action={
            <Button variant="outline" onClick={filters.results.clearAllFilters}>
              Скинути фільтри та пошук
            </Button>
          }
        />
      )}

      <ReferenceSectionAccordion
        campaignId={campaignId}
        isDM={isDM}
        showSkills={filters.ui.showSkills}
        showSpells={filters.ui.showSpells}
        showArtifacts={filters.ui.showArtifacts}
        skillsEmpty={filters.ui.skillsEmpty}
        spellsEmpty={filters.ui.spellsEmpty}
        artifactsEmpty={filters.ui.artifactsEmpty}
        nothingFound={filters.ui.nothingFound}
        filteredSkills={filters.results.filteredSkills}
        filteredSpells={filters.results.filteredSpells}
        filteredArtifacts={filters.results.filteredArtifacts}
        artifactSets={artifactSets}
      />

      {filters.filters.section === "skills" &&
        filters.ui.skillsEmpty &&
        !filters.ui.nothingFound && (
          <EmptyState title="Скілів за цими фільтрами не знайдено." />
        )}
      {filters.filters.section === "spells" &&
        filters.ui.spellsEmpty &&
        !filters.ui.nothingFound && (
          <EmptyState title="Заклинань за цими фільтрами не знайдено." />
        )}
      {filters.filters.section === "artifacts" &&
        filters.ui.artifactsEmpty &&
        !filters.ui.nothingFound && (
          <EmptyState title="Артефактів за цими фільтрами не знайдено." />
        )}
    </div>
  );
}
