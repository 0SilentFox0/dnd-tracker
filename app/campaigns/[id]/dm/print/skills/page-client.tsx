"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";

import { SkillCard } from "@/components/skills/list/SkillCard";
import { Button } from "@/components/ui/button";
import { groupDisplayName } from "@/lib/constants/ungrouped";
import { useTranslator } from "@/lib/i18n/use-translator";
import { PLACEMENT_UNPLACED, skillPlacements } from "@/lib/utils/skills/progression";
import {
  convertGroupedSkillsToArray,
  groupSkillsByMainSkill,
} from "@/lib/utils/skills/skills";
import type { MainSkill } from "@/types/main-skills";
import type { Skill } from "@/types/skills";

interface MainSkillForPrint extends MainSkill {
  spellGroupName: string | null;
}

interface PrintSkillsPageClientProps {
  campaignId: string;
  campaignName: string;
  initialSkills: Skill[];
  mainSkills: MainSkillForPrint[];
  skillTrees: Array<{ id: string; skills: unknown }>;
}

export function PrintSkillsPageClient({
  campaignId,
  campaignName,
  initialSkills,
  mainSkills,
  skillTrees,
}: PrintSkillsPageClientProps) {
  const t = useTranslations("skills.print");

  const tRoot = useTranslator();

  const tGroup = useTranslations("skills.group");

  const positions = useMemo(
    () => skillPlacements(skillTrees),
    [skillTrees]
  );

  const groupedByMainSkill = useMemo(() => {
    const map = groupSkillsByMainSkill(initialSkills, mainSkills);

    return convertGroupedSkillsToArray(map);
  }, [initialSkills, mainSkills]);

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">
            {t("title", { campaign: campaignName })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("hint")}
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="shrink-0"
        >
          <Printer className="h-4 w-4 mr-2" />
          {t("button")}
        </Button>
      </div>

      <header className="mb-6 hidden print:block">
        <h1 className="text-2xl font-bold">
          {t("title", { campaign: campaignName })}
        </h1>
      </header>

      {groupedByMainSkill.length === 0 ? (
        <p className="text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        groupedByMainSkill.map(([groupName, groupSkills]) => {
          const mainSkill = mainSkills.find((ms) => ms.name === groupName);

          const byGroup = new Map<number, { label: string; skills: typeof groupSkills }>();

          for (const skill of groupSkills) {
            const place = positions.get(skill.id) ?? PLACEMENT_UNPLACED;

            const entry = byGroup.get(place.group) ?? { label: tRoot(place.label, place.params), skills: [] };

            entry.skills.push(skill);
            byGroup.set(place.group, entry);
          }

          return (
            <section
              key={groupName}
              className="print-section mb-4"
              style={
                mainSkill?.color
                  ? { borderTop: `4px solid ${mainSkill.color}` }
                  : undefined
              }
            >
              <div className="flex items-center gap-2 py-1.5">
                <div className="leading-tight">
                  <h2 className="text-base font-semibold">{groupDisplayName(groupName, tGroup("ungrouped"))}</h2>
                  {mainSkill?.spellGroupName && (
                    <p className="text-xs text-muted-foreground">
                      {t("school", { group: mainSkill.spellGroupName })}
                    </p>
                  )}
                </div>
              </div>

              {[...byGroup.entries()].sort(([a], [b]) => a - b).map(([group, { label, skills: levelSkills }]) => {
                return (
                  <div key={group} className="mb-2">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {levelSkills.map((skill) => (
                        <div key={skill.id} className="print-card">
                          <SkillCard
                            skill={skill}
                            campaignId={campaignId}
                            printMode
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
