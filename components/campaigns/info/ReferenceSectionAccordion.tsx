"use client";

import { useMemo } from "react";

import { ArtifactReferenceCard } from "./ArtifactReferenceCard";
import { ArtifactSetReferenceCard } from "./ArtifactSetReferenceCard";
import { ReferenceGroupSection } from "./ReferenceGroupSection";
import { SkillReferenceCard } from "./SkillReferenceCard";
import { SpellReferenceCard } from "./SpellReferenceCard";

import { HudPanel } from "@/components/hud/page";
import { Accordion } from "@/components/ui/accordion";
import { groupDisplayName, UNGROUPED_KEY, UNGROUPED_LABELS } from "@/lib/constants/ungrouped";
import type { ArtifactForReference, ArtifactSetForReference, SkillForReference, SpellForReference } from "@/types/info-reference";

interface ReferenceSectionAccordionProps {
  campaignId: string;
  isDM: boolean;
  showSkills: boolean;
  showSpells: boolean;
  showArtifacts: boolean;
  skillsEmpty: boolean;
  spellsEmpty: boolean;
  artifactsEmpty: boolean;
  nothingFound: boolean;
  filteredSkills: SkillForReference[];
  filteredSpells: SpellForReference[];
  filteredArtifacts: ArtifactForReference[];
  artifactSets: ArtifactSetForReference[];
}

export function ReferenceSectionAccordion({
  campaignId,
  isDM,
  showSkills,
  showSpells,
  showArtifacts,
  skillsEmpty,
  spellsEmpty,
  artifactsEmpty,
  nothingFound,
  filteredSkills,
  filteredSpells,
  filteredArtifacts,
  artifactSets,
}: ReferenceSectionAccordionProps) {
  const skillsByMain = useMemo(() => {
    const map = new Map<string, SkillForReference[]>();

    for (const s of filteredSkills) {
      const key = s.mainSkillName ?? UNGROUPED_KEY;

      const list = map.get(key) ?? [];

      list.push(s);
      map.set(key, list);
    }

    return map;
  }, [filteredSkills]);

  const spellsByGroup = useMemo(() => {
    const map = new Map<string, SpellForReference[]>();

    for (const s of filteredSpells) {
      const key = s.groupName ?? UNGROUPED_KEY;

      const list = map.get(key) ?? [];

      list.push(s);
      map.set(key, list);
    }

    return map;
  }, [filteredSpells]);

  const artifactsBySet = useMemo(() => {
    const map = new Map<string, ArtifactForReference[]>();

    for (const a of filteredArtifacts) {
      const key = a.setName ?? UNGROUPED_KEY;

      const list = map.get(key) ?? [];

      list.push(a);
      map.set(key, list);
    }

    return map;
  }, [filteredArtifacts]);

  const skillsVisible = showSkills && !skillsEmpty;

  const spellsVisible = showSpells && !spellsEmpty;

  const artifactsVisible = showArtifacts && !artifactsEmpty;

  const hasContent = !nothingFound && (skillsVisible || spellsVisible || artifactsVisible);

  if (!hasContent) return null;

  const showBoth = [skillsVisible, spellsVisible, artifactsVisible].filter(Boolean).length > 1;

  return (
    <div className="space-y-3">
      {skillsVisible && (
        <HudPanel className="space-y-3">
          {showBoth && (
            <h2 className="hud-sc scroll-mt-4 text-lg text-hud-gold" id="ref-skills">
              Скіли
            </h2>
          )}
          <p className="text-sm text-hud-muted">
            Як діють скіли та як вони виглядають у грі. Опис вигляду може
            редагувати лише DM.
          </p>
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
                    accordionValue={mainName}
                    title={groupDisplayName(mainName, UNGROUPED_LABELS.branch)}
                    icon={first?.mainSkillIcon ?? null}
                    accentColor={first?.mainSkillColor ?? null}
                    count={list.length}
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
              Заклинання
            </h2>
          )}
          <p className="text-sm text-hud-muted">
            Як діють заклинання та як вони виглядають. Опис вигляду може
            редагувати лише DM.
          </p>
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
                  accordionValue={groupName}
                  title={groupDisplayName(groupName, UNGROUPED_LABELS.spellGroup)}
                  count={list.length}
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
              Артефакти
            </h2>
          )}
          <p className="text-sm text-hud-muted">
            Артефакти кампанії: що дають і хто їх носить. Кожен артефакт
            унікальний і належить одному герою.
          </p>
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
                  accordionValue={setName}
                  title={groupDisplayName(setName, UNGROUPED_LABELS.artifactSet)}
                  count={list.length}
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
              <h3 className="hud-sc text-base text-hud-gold">Сети</h3>
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
