"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Printer, Sparkles } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { SkillGroupAccordion } from "@/components/skills/list/SkillGroupAccordion";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import {
  useDeleteAllSkills,
  useDeleteSkill,
  useDuplicateSkill,
  useMainSkills,
  useSkills,
} from "@/lib/hooks/skills";
import { pluralUk } from "@/lib/utils/plural";
import {
  convertGroupedSkillsToArray,
  groupSkillsByMainSkill,
} from "@/lib/utils/skills/skills";
import type { Skill } from "@/types/skills";

interface DMSkillsPageClientProps {
  campaignId: string;
  initialSkills: Skill[];
}

export function DMSkillsPageClient({
  campaignId,
  initialSkills,
}: DMSkillsPageClientProps) {
  const notify = useNotify();

  const confirm = useConfirm();

  const { data: skills = initialSkills, isLoading: skillsLoading } = useSkills(
    campaignId,
    initialSkills
  );

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const deleteAllSkillsMutation = useDeleteAllSkills(campaignId);

  const deleteSkillMutation = useDeleteSkill(campaignId);

  const duplicateSkillMutation = useDuplicateSkill(campaignId);

  const groupedSkills = useMemo(() => {
    const groupedSkillsMap = groupSkillsByMainSkill(skills, mainSkills);

    return convertGroupedSkillsToArray(groupedSkillsMap);
  }, [skills, mainSkills]);

  const handleDeleteAll = () =>
    confirm({
      title: "Видалити всі скіли?",
      description: `Ця дія видалить всі скіли з бібліотеки (${skills.length} ${pluralUk(skills.length, ["скіл", "скіли", "скілів"])}). Цю дію неможливо скасувати.`,
      confirmLabel: "Видалити всі",
      destructive: true,
      onConfirm: () => deleteAllSkillsMutation.mutateAsync(),
    });

  const handleDeleteSkill = (skillId: string) => deleteSkillMutation.mutateAsync(skillId);

  const handleDuplicateSkill = async (skillId: string) => {
    try {
      await duplicateSkillMutation.mutateAsync(skillId);
    } catch (error) {
      console.error("Error duplicating skill:", error);
      void notify("Не вдалося дублювати скіл. Спробуйте ще раз.");
    }
  };

  return (
    <HudPage>
      <HudPageHeader
        title="Бібліотека Скілів"
        subtitle="Управління скілами та їх ефектами"
        actions={
          <>
            <Link href={`/campaigns/${campaignId}/dm/main-skills`}>
              <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm">
                + Основний навик
              </Button>
            </Link>
            <Link href={`/campaigns/${campaignId}/dm/skills/new`}>
              <Button className="whitespace-nowrap text-xs sm:text-sm">+ Створити скіл</Button>
            </Link>
            {skills.length > 0 && (
              <Link href={`/campaigns/${campaignId}/dm/print/skills`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm">
                  <Printer className="h-4 w-4 mr-1" />
                  Версія для друку
                </Button>
              </Link>
            )}
            {skills.length > 0 && (
              <Button variant="destructive" className="whitespace-nowrap text-xs sm:text-sm" onClick={() => void handleDeleteAll()}>
                Видалити всі
              </Button>
            )}
          </>
        }
      />

      {skillsLoading && skills.length === 0 ? (
        <LoadingState rows={6} label="Завантаження скілів…" />
      ) : skills.length === 0 ? (
        <EmptyState icon={Sparkles} title="Ще немає скілів" description="Створіть перший скіл, щоб наповнити дерево прокачки." action={<Link href={`/campaigns/${campaignId}/dm/skills/new`}><Button>Створити перший скіл</Button></Link>} />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={groupedSkills.map(([groupName]) => groupName)}
          className="space-y-2"
        >
          {groupedSkills.map(([groupName, groupSkills]) => {
            const mainSkill = mainSkills.find((ms) => ms.name === groupName);

            return (
              <SkillGroupAccordion
                key={groupName}
                groupName={groupName}
                skills={groupSkills}
                campaignId={campaignId}
                spellGroups={[]}
                mainSkillColor={mainSkill?.color}
                onDeleteSkill={handleDeleteSkill}
                onDuplicateSkill={handleDuplicateSkill}
              />
            );
          })}
        </Accordion>
      )}
    </HudPage>
  );
}
