"use client";

import { useMemo } from "react";

import { ReferenceGroupSection } from "./ReferenceGroupSection";
import { SkillReferenceCard } from "./SkillReferenceCard";
import { SpellReferenceCard } from "./SpellReferenceCard";

import { Accordion } from "@/components/ui/accordion";
import type { SkillForReference, SpellForReference } from "@/lib/types/info-reference";

const NO_MAIN_SKILL_LABEL = "Без гілки";

const NO_SPELL_GROUP_LABEL = "Без групи";

interface ReferenceSectionAccordionProps {
  campaignId: string;
  isDM: boolean;
  showSkills: boolean;
  showSpells: boolean;
  skillsEmpty: boolean;
  spellsEmpty: boolean;
  nothingFound: boolean;
  filteredSkills: SkillForReference[];
  filteredSpells: SpellForReference[];
}

export function ReferenceSectionAccordion({
  campaignId,
  isDM,
  showSkills,
  showSpells,
  skillsEmpty,
  spellsEmpty,
  nothingFound,
  filteredSkills,
  filteredSpells,
}: ReferenceSectionAccordionProps) {
  const skillsByMain = useMemo(() => {
    const map = new Map<string, SkillForReference[]>();

    for (const s of filteredSkills) {
      const key = s.mainSkillName ?? NO_MAIN_SKILL_LABEL;

      const list = map.get(key) ?? [];

      list.push(s);
      map.set(key, list);
    }

    return map;
  }, [filteredSkills]);

  const spellsByGroup = useMemo(() => {
    const map = new Map<string, SpellForReference[]>();

    for (const s of filteredSpells) {
      const key = s.groupName ?? NO_SPELL_GROUP_LABEL;

      const list = map.get(key) ?? [];

      list.push(s);
      map.set(key, list);
    }

    return map;
  }, [filteredSpells]);

  const hasContent =
    (!nothingFound && showSkills && !skillsEmpty) ||
    (showSpells && !spellsEmpty);

  if (!hasContent) return null;

  const showBoth = showSkills && !skillsEmpty && showSpells && !spellsEmpty;

  return (
    <div className="space-y-8">
      {showSkills && !skillsEmpty && (
        <div className="space-y-4">
          {showBoth && (
            <h2 className="text-lg font-semibold scroll-mt-4" id="ref-skills">
              Скіли
            </h2>
          )}
          <p className="text-muted-foreground text-sm px-0">
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
                if (a === NO_MAIN_SKILL_LABEL) return 1;

                if (b === NO_MAIN_SKILL_LABEL) return -1;

                return a.localeCompare(b);
              })
              .map(([mainName, list]) => {
                const first = list[0];

                return (
                  <ReferenceGroupSection
                    key={mainName}
                    accordionValue={mainName}
                    title={mainName}
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
        </div>
      )}

      {showSpells && !spellsEmpty && (
        <div className="space-y-4">
          {showBoth && (
            <h2 className="text-lg font-semibold scroll-mt-4" id="ref-spells">
              Заклинання
            </h2>
          )}
          <p className="text-muted-foreground text-sm px-0">
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
                if (a === NO_SPELL_GROUP_LABEL) return 1;

                if (b === NO_SPELL_GROUP_LABEL) return -1;

                return a.localeCompare(b);
              })
              .map(([groupName, list]) => (
                <ReferenceGroupSection
                  key={groupName}
                  accordionValue={groupName}
                  title={groupName}
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
        </div>
      )}
    </div>
  );
}
