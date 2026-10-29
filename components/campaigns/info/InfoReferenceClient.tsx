"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ReferenceSearchBar } from "./ReferenceSearchBar";
import { ReferenceSectionAccordion } from "./ReferenceSectionAccordion";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useInfoReferenceFilters } from "@/lib/hooks/campaigns";
import type { ArtifactForReference, ArtifactSetForReference, ClassForReference, SkillForReference, SpellForReference } from "@/types/info-reference";

export interface InfoReferenceClientProps {
  campaignId: string;
  skills: SkillForReference[];
  spells: SpellForReference[];
  artifacts: ArtifactForReference[];
  artifactSets: ArtifactSetForReference[];
  classes: ClassForReference[] | null;
  isDM: boolean;
}

const strong = (chunks: ReactNode) => <strong className="text-hud-ink">{chunks}</strong>;

export function InfoReferenceClient({
  campaignId,
  skills,
  spells,
  artifacts,
  artifactSets,
  classes,
  isDM,
}: InfoReferenceClientProps) {
  const t = useTranslations("dashboard.reference");

  const { filters, results, ui } = useInfoReferenceFilters(skills, spells, artifacts, classes);

  const section = filters.section.value;

  return (
    <div className="space-y-3">
      <ReferenceSearchBar filters={filters} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-hud-panel px-3 py-2 text-sm text-hud-muted">
        {section === "all" && (
          <>
            {filters.classMode ? (
              <span>{t.rich("count.classes", { count: results.filteredClasses.length, strong })}</span>
            ) : (
              <span>{t.rich("count.skills", { count: results.filteredSkills.length, strong })}</span>
            )}
            <span>{t.rich("count.spells", { count: results.filteredSpells.length, strong })}</span>
            <span>{t.rich("count.artifacts", { count: results.filteredArtifacts.length, strong })}</span>
            {filters.visible.classes && !ui.classesEmpty && (
              <a
                href="#ref-classes"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-hud-gold-strong hover:underline"
              >
                {t("jump.classes")}
              </a>
            )}
            {filters.visible.skills && !ui.skillsEmpty && (
              <a
                href="#ref-skills"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-hud-gold-strong hover:underline"
              >
                {t("jump.skills")}
              </a>
            )}
            {!ui.spellsEmpty && (
              <a
                href="#ref-spells"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-hud-gold-strong hover:underline"
              >
                {t("jump.spells")}
              </a>
            )}
            {!ui.artifactsEmpty && (
              <a
                href="#ref-artifacts"
                className="touch-manipulation text-hud-gold underline-offset-2 hover:text-hud-gold-strong hover:underline"
              >
                {t("jump.artifacts")}
              </a>
            )}
          </>
        )}
        {section === "classes" && (
          <>{t.rich("shown.classes", { count: results.filteredClasses.length, strong })}</>
        )}
        {section === "classes" &&
        ui.classesEmpty &&
        !ui.nothingFound && (
          <EmptyState title={t("empty.classes")} />
        )}
      {section === "skills" && (
          <>{t.rich("shown.skills", { count: results.filteredSkills.length, strong })}</>
        )}
        {section === "artifacts" && (
          <>{t.rich("shown.artifacts", { count: results.filteredArtifacts.length, strong })}</>
        )}
        {section === "spells" && (
          <>{t.rich("shown.spells", { count: results.filteredSpells.length, strong })}</>
        )}
      </div>

      {ui.nothingFound && (
        <EmptyState
          className="bg-hud-panel"
          title={t("empty.nothing")}
          description={t("empty.nothingHint")}
          action={
            <Button variant="outline" onClick={filters.clearAll}>
              {t("empty.resetAll")}
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
          classes: results.filteredClasses,
        }}
      />

      {section === "classes" &&
        ui.classesEmpty &&
        !ui.nothingFound && (
          <EmptyState title={t("empty.classes")} />
        )}
      {section === "skills" &&
        ui.skillsEmpty &&
        !ui.nothingFound && (
          <EmptyState title={t("empty.skills")} />
        )}
      {section === "spells" &&
        ui.spellsEmpty &&
        !ui.nothingFound && (
          <EmptyState title={t("empty.spells")} />
        )}
      {section === "artifacts" &&
        ui.artifactsEmpty &&
        !ui.nothingFound && (
          <EmptyState title={t("empty.artifacts")} />
        )}
    </div>
  );
}
