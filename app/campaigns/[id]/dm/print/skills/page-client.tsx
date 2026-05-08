"use client";

import { useMemo } from "react";
import { Printer } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { SkillCard } from "@/components/skills/list/SkillCard";
import { Button } from "@/components/ui/button";
import {
  buildSkillPositionMap,
  groupSkillsByLevel,
  SKILL_LEVEL_LABEL,
  type SkillLevelKey,
} from "@/lib/utils/skills/skill-tree-positions";
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
  skillTrees: Array<{ skills: unknown }>;
}

const LEVEL_ORDER: (SkillLevelKey | "other")[] = [
  "basic",
  "advanced",
  "expert",
  "other",
];

export function PrintSkillsPageClient({
  campaignId,
  campaignName,
  initialSkills,
  mainSkills,
  skillTrees,
}: PrintSkillsPageClientProps) {
  const positions = useMemo(
    () => buildSkillPositionMap(skillTrees),
    [skillTrees],
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
            Кампанія «{campaignName}» — Скіли
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Версія для друку. Натисніть Cmd/Ctrl+P щоб зберегти PDF.
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="shrink-0"
        >
          <Printer className="h-4 w-4 mr-2" />
          Друкувати
        </Button>
      </div>

      <header className="mb-6 hidden print:block">
        <h1 className="text-2xl font-bold">
          Кампанія «{campaignName}» — Скіли
        </h1>
      </header>

      {groupedByMainSkill.length === 0 ? (
        <p className="text-muted-foreground">
          У кампанії немає скілів для друку.
        </p>
      ) : (
        groupedByMainSkill.map(([groupName, groupSkills]) => {
          const mainSkill = mainSkills.find((ms) => ms.name === groupName);

          const byLevel = groupSkillsByLevel(groupSkills, positions);

          return (
            <section
              key={groupName}
              className="print-section mb-8"
              style={
                mainSkill?.color
                  ? { borderTop: `4px solid ${mainSkill.color}` }
                  : undefined
              }
            >
              <div className="flex items-center gap-3 py-3">
                {mainSkill?.icon && (
                  <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                    <OptimizedImage
                      src={mainSkill.icon}
                      alt={mainSkill.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">{groupName}</h2>
                  {mainSkill?.spellGroupName && (
                    <p className="text-sm text-muted-foreground">
                      Школа магії: {mainSkill.spellGroupName}
                    </p>
                  )}
                </div>
              </div>

              {LEVEL_ORDER.map((levelKey) => {
                const levelSkills = byLevel[levelKey];

                if (!levelSkills.length) return null;

                return (
                  <div key={levelKey} className="mb-6">
                    <h3 className="text-base font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
                      {SKILL_LEVEL_LABEL[levelKey]}
                      <span className="ml-2 text-xs font-normal">
                        ({levelSkills.length})
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
