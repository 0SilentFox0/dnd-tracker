"use client";

import { ReferenceSearchBar } from "./ReferenceSearchBar";
import { ReferenceSectionAccordion } from "./ReferenceSectionAccordion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInfoReferenceFilters } from "@/lib/hooks/common";
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
        showSkillsFilter={filters.filters.section === "all" || filters.filters.section === "skills"}
        showSpellsFilter={filters.filters.section === "all" || filters.filters.section === "spells"}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {filters.ui.showSkills && filters.ui.showSpells && (
          <>
            <span>
              Скілів:{" "}
              <strong className="text-foreground">
                {filters.results.filteredSkills.length}
              </strong>
            </span>
            <span>
              Заклинань:{" "}
              <strong className="text-foreground">
                {filters.results.filteredSpells.length}
              </strong>
            </span>
            {!filters.ui.skillsEmpty && (
              <a
                href="#ref-skills"
                className="text-primary underline-offset-2 hover:underline touch-manipulation"
              >
                До скілів
              </a>
            )}
            {!filters.ui.spellsEmpty && (
              <a
                href="#ref-spells"
                className="text-primary underline-offset-2 hover:underline touch-manipulation"
              >
                До заклинань
              </a>
            )}
          </>
        )}
{filters.filters.section === "skills" && (
          <>
            Показано скілів:{" "}
              <strong className="text-foreground">
                {filters.results.filteredSkills.length}
              </strong>
          </>
        )}
{filters.filters.section === "spells" && (
          <>
            Показано заклинань:{" "}
              <strong className="text-foreground">
                {filters.results.filteredSpells.length}
              </strong>
          </>
        )}
      </div>

      {filters.ui.nothingFound && (
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
              onClick={filters.results.clearAllFilters}
            >
              Скинути фільтри та пошук
            </Button>
          </CardContent>
        </Card>
      )}

      <ReferenceSectionAccordion
        campaignId={campaignId}
        isDM={isDM}
        showSkills={filters.ui.showSkills}
        showSpells={filters.ui.showSpells}
        skillsEmpty={filters.ui.skillsEmpty}
        spellsEmpty={filters.ui.spellsEmpty}
        nothingFound={filters.ui.nothingFound}
        filteredSkills={filters.results.filteredSkills}
        filteredSpells={filters.results.filteredSpells}
      />

      {filters.filters.section === "skills" &&
        filters.ui.skillsEmpty &&
        !filters.ui.nothingFound && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Скілів за цими фільтрами не знайдено.
            </CardContent>
          </Card>
        )}
      {filters.filters.section === "spells" &&
        filters.ui.spellsEmpty &&
        !filters.ui.nothingFound && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Заклинань за цими фільтрами не знайдено.
            </CardContent>
          </Card>
        )}
    </div>
  );
}
