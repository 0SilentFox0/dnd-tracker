"use client";

import { useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import { useSkills } from "@/lib/hooks/useSkills";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import type { Skill } from "@/lib/types/skills";
import type { Race } from "@/lib/types/races";
import {
  groupSkillsByMainSkill,
  convertGroupedSkillsToArray,
} from "@/lib/utils/skills";
import { SkillGroupAccordion } from "@/components/skills/SkillGroupAccordion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DMSkillsPageClientProps {
  campaignId: string;
  initialSkills: Skill[];
  initialRaces: Race[];
}

export function DMSkillsPageClient({
  campaignId,
  initialSkills,
  initialRaces,
}: DMSkillsPageClientProps) {
  // Запити для скілів та основних навиків
  const { data: skills = initialSkills, isLoading: skillsLoading } = useSkills(
    campaignId,
    initialSkills
  );
  const { data: mainSkills = [] } = useMainSkills(campaignId);

  // Групуємо скіли по основним навикам
  const groupedSkills = useMemo(() => {
    const groupedSkillsMap = groupSkillsByMainSkill(skills, mainSkills);
    return convertGroupedSkillsToArray(groupedSkillsMap);
  }, [skills, mainSkills]);

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6 max-w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-bold">Бібліотека Скілів</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Управління скілами та їх ефектами
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href={`/campaigns/${campaignId}/dm/main-skills`}>
            <Button
              variant="outline"
              className="whitespace-nowrap text-xs sm:text-sm"
            >
              + Основний навик
            </Button>
          </Link>
          <Link href={`/campaigns/${campaignId}/dm/skills/new`}>
            <Button className="whitespace-nowrap text-xs sm:text-sm">
              + Створити скіл
            </Button>
          </Link>
        </div>
      </div>

      {skillsLoading && (
        <div className="text-center py-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            Оновлення...
          </p>
        </div>
      )}

      {!skillsLoading && skills.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            Поки немає скілів
          </p>
          <Link href={`/campaigns/${campaignId}/dm/skills/new`}>
            <Button>Створити перший скіл</Button>
          </Link>
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={groupedSkills.map(([groupName]) => groupName)}
          className="space-y-2 sm:space-y-4"
        >
          {groupedSkills.map(([groupName, groupSkills]) => (
            <SkillGroupAccordion
              key={groupName}
              groupName={groupName}
              skills={groupSkills}
              campaignId={campaignId}
              spellGroups={[]}
              initialRaces={initialRaces}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}
