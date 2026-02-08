"use client";

import { ReferenceSearchBar } from "./ReferenceSearchBar";
import { ReferenceSectionAccordion } from "./ReferenceSectionAccordion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInfoReferenceFilters } from "@/lib/hooks/useInfoReferenceFilters";
import type { SkillForReference, SpellForReference } from "@/lib/types/info-reference";

export interface InfoReferenceClientProps {
  campaignId: string;
  skills: SkillForReference[];
  spells: SpellForReference[];
  isDM: boolean;
}

export function InfoReferenceClient({
  campaignId,
  skills,
  spells,
  isDM,
}: InfoReferenceClientProps) {
  const filters = useInfoReferenceFilters(skills, spells);

  return (
    <div className="space-y-6">
      <ReferenceSearchBar
        searchQuery={filters.searchQuery}
        setSearchQuery={filters.setSearchQuery}
        section={filters.section}
        setSection={filters.setSection}
        filtersOpen={filters.filtersOpen}
        setFiltersOpen={filters.setFiltersOpen}
        hasActiveFilters={filters.hasActiveFilters}
        clearAllFilters={filters.clearAllFilters}
        mainSkillFilter={filters.mainSkillFilter}
        setMainSkillFilter={filters.setMainSkillFilter}
        spellLevelFilter={filters.spellLevelFilter}
        setSpellLevelFilter={filters.setSpellLevelFilter}
        spellGroupFilter={filters.spellGroupFilter}
        setSpellGroupFilter={filters.setSpellGroupFilter}
        spellTypeFilter={filters.spellTypeFilter}
        setSpellTypeFilter={filters.setSpellTypeFilter}
        mainSkillOptions={filters.mainSkillOptions}
        spellLevelOptions={filters.spellLevelOptions}
        spellGroupOptions={filters.spellGroupOptions}
        spellTypeOptions={filters.spellTypeOptions}
        showSkillsFilter={filters.section === "all" || filters.section === "skills"}
        showSpellsFilter={filters.section === "all" || filters.section === "spells"}
      />

      <div className="text-sm text-muted-foreground">
        {filters.showSkills && filters.showSpells && (
          <>
            Скілів:{" "}
            <strong className="text-foreground">
              {filters.filteredSkills.length}
            </strong>
            {" · "}
            Заклинань:{" "}
            <strong className="text-foreground">
              {filters.filteredSpells.length}
            </strong>
          </>
        )}
        {filters.section === "skills" && (
          <>
            Показано скілів:{" "}
            <strong className="text-foreground">
              {filters.filteredSkills.length}
            </strong>
          </>
        )}
        {filters.section === "spells" && (
          <>
            Показано заклинань:{" "}
            <strong className="text-foreground">
              {filters.filteredSpells.length}
            </strong>
          </>
        )}
      </div>

      {filters.nothingFound && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground font-medium">
              Нічого не знайдено
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Змініть пошук або фільтри, або скиньте їх.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={filters.clearAllFilters}
            >
              Скинути фільтри та пошук
            </Button>
          </CardContent>
        </Card>
      )}

      <ReferenceSectionAccordion
        campaignId={campaignId}
        isDM={isDM}
        showSkills={filters.showSkills}
        showSpells={filters.showSpells}
        skillsEmpty={filters.skillsEmpty}
        spellsEmpty={filters.spellsEmpty}
        nothingFound={filters.nothingFound}
        filteredSkills={filters.filteredSkills}
        filteredSpells={filters.filteredSpells}
      />

      {filters.section === "skills" &&
        filters.skillsEmpty &&
        !filters.nothingFound && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Скілів за цими фільтрами не знайдено.
            </CardContent>
          </Card>
        )}
      {filters.section === "spells" &&
        filters.spellsEmpty &&
        !filters.nothingFound && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Заклинань за цими фільтрами не знайдено.
            </CardContent>
          </Card>
        )}
    </div>
  );
}
