"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { ArtifactReferenceCard } from "./ArtifactReferenceCard";
import { ArtifactSetReferenceCard } from "./ArtifactSetReferenceCard";
import { ClassReferenceCard } from "./ClassReferenceCard";
import { ReferenceGroupSection } from "./ReferenceGroupSection";
import { SkillReferenceCard } from "./SkillReferenceCard";
import { SpellReferenceCard } from "./SpellReferenceCard";

import { HudPanel } from "@/components/hud/page";
import { Accordion } from "@/components/ui/accordion";
import { groupDisplayName, UNGROUPED_KEY } from "@/lib/constants/ungrouped";
import { groupBy } from "@/lib/utils/common/collections";
import type { ArtifactForReference, ArtifactSetForReference, ClassForReference, SkillForReference, SpellForReference } from "@/types/info-reference";

interface ReferenceSectionAccordionProps {
  campaignId: string;
  isDM: boolean;
  shown: { skills: boolean; spells: boolean; artifacts: boolean; classes: boolean };
  items: {
    skills: SkillForReference[];
    spells: SpellForReference[];
    artifacts: ArtifactForReference[];
    artifactSets: ArtifactSetForReference[];
    classes: ClassForReference[];
  };
}

export function ReferenceSectionAccordion({ campaignId, isDM, shown, items }: ReferenceSectionAccordionProps) {
  const t = useTranslations("dashboard.reference.sections");

  const tu = useTranslations("common.ungrouped");

  const { skills: filteredSkills, spells: filteredSpells, artifacts: filteredArtifacts, artifactSets, classes: filteredClasses } = items;

  const skillsByMain = useMemo(() => groupBy(filteredSkills, (s) => s.mainSkillName ?? UNGROUPED_KEY), [filteredSkills]);

  const spellsByGroup = useMemo(() => groupBy(filteredSpells, (s) => s.groupName ?? UNGROUPED_KEY), [filteredSpells]);

  const artifactsBySet = useMemo(() => groupBy(filteredArtifacts, (a) => a.setName ?? UNGROUPED_KEY), [filteredArtifacts]);

  const { skills: skillsVisible, spells: spellsVisible, artifacts: artifactsVisible, classes: classesVisible } = shown;

  if (!skillsVisible && !spellsVisible && !artifactsVisible && !classesVisible) return null;

  const showBoth = [skillsVisible, spellsVisible, artifactsVisible, classesVisible].filter(Boolean).length > 1;

  return (
    <div className="space-y-3">
      {classesVisible && (
        <HudPanel className="space-y-3">
          {showBoth && (
            <h2 className="hud-sc scroll-mt-4 text-lg text-hud-gold" id="ref-classes">
              {t("classes.title")}
            </h2>
          )}
          <p className="text-sm text-hud-muted">{t("classes.intro")}</p>
          <Accordion
            type="multiple"
            defaultValue={[]}
            className="grid grid-cols-1 gap-3 w-full sm:grid-cols-2"
          >
            {filteredClasses.map((c) => (
              <ClassReferenceCard key={c.id} gameClass={c} />
            ))}
          </Accordion>
        </HudPanel>
      )}

      {skillsVisible && (
        <HudPanel className="space-y-3">
          {showBoth && (
            <h2 className="hud-sc scroll-mt-4 text-lg text-hud-gold" id="ref-skills">
              {t("skills.title")}
            </h2>
          )}
          <p className="text-sm text-hud-muted">{t("skills.intro")}</p>
          <Accordion
            type="multiple"
            defaultValue={[]}
            className="grid grid-cols-1 gap-3 w-full"
          >
            {Array.from(skillsByMain.entries())
              .sort(([a], [b]) => {
                if (a === UNGROUPED_KEY) return 1;

                if (b === UNGROUPED_KEY) return -1;

                return a.localeCompare(b);
              })
              .map(([mainName, list]) => {
                const first = list[0];

                return (
                  <ReferenceGroupSection
                    key={mainName}
                    group={{
                      accordionValue: mainName,
                      title: groupDisplayName(mainName, tu("branch")),
                      icon: first?.mainSkillIcon ?? null,
                      accentColor: first?.mainSkillColor ?? null,
                      count: list.length,
                    }}
                  >
                    <Accordion
                      type="multiple"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
                    >
                      {list.map((skill) => (
                        <SkillReferenceCard
                          key={skill.id}
                          campaignId={campaignId}
                          skill={skill}
                          isDM={isDM}
                        />
                      ))}
                    </Accordion>
                  </ReferenceGroupSection>
                );
              })}
          </Accordion>
        </HudPanel>
      )}

      {spellsVisible && (
        <HudPanel className="space-y-3">
          {showBoth && (
            <h2 className="hud-sc scroll-mt-4 text-lg text-hud-gold" id="ref-spells">
              {t("spells.title")}
            </h2>
          )}
          <p className="text-sm text-hud-muted">{t("spells.intro")}</p>
          <Accordion
            type="multiple"
            defaultValue={[]}
            className="grid grid-cols-1 gap-3 w-full"
          >
            {Array.from(spellsByGroup.entries())
              .sort(([a], [b]) => {
                if (a === UNGROUPED_KEY) return 1;

                if (b === UNGROUPED_KEY) return -1;

                return a.localeCompare(b);
              })
              .map(([groupName, list]) => (
                <ReferenceGroupSection
                  key={groupName}
                  group={{
                    accordionValue: groupName,
                    title: groupDisplayName(groupName, tu("spellGroup")),
                    count: list.length,
                  }}
                >
                  <Accordion
                    type="multiple"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
                  >
                    {list.map((spell) => (
                      <SpellReferenceCard
                        key={spell.id}
                        campaignId={campaignId}
                        spell={spell}
                        isDM={isDM}
                      />
                    ))}
                  </Accordion>
                </ReferenceGroupSection>
              ))}
          </Accordion>
        </HudPanel>
      )}

      {artifactsVisible && (
        <HudPanel className="space-y-3">
          {showBoth && (
            <h2 className="hud-sc scroll-mt-4 text-lg text-hud-gold" id="ref-artifacts">
              {t("artifacts.title")}
            </h2>
          )}
          <p className="text-sm text-hud-muted">{t("artifacts.intro")}</p>
          <Accordion
            type="multiple"
            defaultValue={[]}
            className="grid grid-cols-1 gap-3 w-full"
          >
            {Array.from(artifactsBySet.entries())
              .sort(([a], [b]) => {
                if (a === UNGROUPED_KEY) return 1;

                if (b === UNGROUPED_KEY) return -1;

                return a.localeCompare(b);
              })
              .map(([setName, list]) => (
                <ReferenceGroupSection
                  key={setName}
                  group={{
                    accordionValue: setName,
                    title: groupDisplayName(setName, tu("artifactSet")),
                    count: list.length,
                  }}
                >
                  <Accordion
                    type="multiple"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
                  >
                    {list.map((artifact) => (
                      <ArtifactReferenceCard key={artifact.id} artifact={artifact} />
                    ))}
                  </Accordion>
                </ReferenceGroupSection>
              ))}
          </Accordion>
          {artifactSets.length > 0 && (
            <div className="space-y-2">
              <h3 className="hud-sc text-base text-hud-gold">{t("sets.title")}</h3>
              <Accordion
                type="multiple"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
              >
                {artifactSets.map((set) => (
                  <ArtifactSetReferenceCard key={set.id} set={set} />
                ))}
              </Accordion>
            </div>
          )}
        </HudPanel>
      )}
    </div>
  );
}
