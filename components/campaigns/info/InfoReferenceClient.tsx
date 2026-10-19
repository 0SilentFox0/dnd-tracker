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
  const { filters, results, ui } = useInfoReferenceFilters(skills, spells, artifacts);

  const section = filters.section.value;

  return (
    <div className="space-y-3">
      <ReferenceSearchBar filters={filters} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-hud-panel px-3 py-2 text-sm text-hud-muted">
        {section === "all" && (
          <>
            <span>
              Скілів:{" "}
              <strong className="text-hud-ink">
                {results.filteredSkills.length}
              </strong>
            </span>
            <span>
              Заклинань:{" "}
              <strong className="text-hud-ink">
                {results.filteredSpells.length}
              </strong>
            </span>
            <span>
              Артефактів:{" "}
              <strong className="text-hud-ink">
                {results.filteredArtifacts.length}
              </strong>
            </span>
            {!ui.skillsEmpty && (
              <a
                href="#ref-skills"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-hud-gold-strong hover:underline"
              >
                До скілів
              </a>
            )}
            {!ui.spellsEmpty && (
              <a
                href="#ref-spells"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-hud-gold-strong hover:underline"
              >
                До заклинань
              </a>
            )}
            {!ui.artifactsEmpty && (
              <a
                href="#ref-artifacts"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-hud-gold-strong hover:underline"
              >
                До артефактів
              </a>
            )}
          </>
        )}
        {section === "skills" && (
          <>
            Показано скілів:{" "}
            <strong className="text-hud-ink">
                {results.filteredSkills.length}
              </strong>
          </>
        )}
        {section === "artifacts" && (
          <>
            Показано артефактів:{" "}
            <strong className="text-hud-ink">
                {results.filteredArtifacts.length}
              </strong>
          </>
        )}
        {section === "spells" && (
          <>
            Показано заклинань:{" "}
            <strong className="text-hud-ink">
                {results.filteredSpells.length}
              </strong>
          </>
        )}
      </div>

      {ui.nothingFound && (
        <EmptyState
          className="bg-hud-panel"
          title="Нічого не знайдено"
          description="Змініть пошук або фільтри, або скиньте їх."
          action={
            <Button variant="outline" onClick={filters.clearAll}>
              Скинути фільтри та пошук
            </Button>
          }
        />
      )}

      <ReferenceSectionAccordion
        campaignId={campaignId}
        isDM={isDM}
        shown={ui.shown}
        items={{
          skills: results.filteredSkills,
          spells: results.filteredSpells,
          artifacts: results.filteredArtifacts,
          artifactSets,
        }}
      />

      {section === "skills" &&
        ui.skillsEmpty &&
        !ui.nothingFound && (
          <EmptyState title="Скілів за цими фільтрами не знайдено." />
        )}
      {section === "spells" &&
        ui.spellsEmpty &&
        !ui.nothingFound && (
          <EmptyState title="Заклинань за цими фільтрами не знайдено." />
        )}
      {section === "artifacts" &&
        ui.artifactsEmpty &&
        !ui.nothingFound && (
          <EmptyState title="Артефактів за цими фільтрами не знайдено." />
        )}
    </div>
  );
}
