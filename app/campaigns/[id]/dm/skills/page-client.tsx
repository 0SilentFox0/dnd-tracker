"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Printer, Sparkles } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
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

  // Запити для скілів та основних навиків
  const { data: skills = initialSkills, isLoading: skillsLoading } = useSkills(
    campaignId,
    initialSkills
  );

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  // Мутації видалення
  const deleteAllSkillsMutation = useDeleteAllSkills(campaignId);

  const deleteSkillMutation = useDeleteSkill(campaignId);

  const duplicateSkillMutation = useDuplicateSkill(campaignId);

  // Групуємо скіли по основним навикам
  const groupedSkills = useMemo(() => {
    const groupedSkillsMap = groupSkillsByMainSkill(skills, mainSkills);

    return convertGroupedSkillsToArray(groupedSkillsMap);
  }, [skills, mainSkills]);

  const handleDeleteAll = () =>
    confirm({
      title: "Видалити всі скіли?",
      description: `Ця дія видалить всі скіли з бібліотеки (${skills.length} скілів). Цю дію неможливо скасувати.`,
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
          {skills.length > 0 && (
            <Link
              href={`/campaigns/${campaignId}/dm/print/skills`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="whitespace-nowrap text-xs sm:text-sm"
              >
                <Printer className="h-4 w-4 mr-1" />
                Версія для друку
              </Button>
            </Link>
          )}
          {skills.length > 0 && (
            <Button
              variant="destructive"
              className="whitespace-nowrap text-xs sm:text-sm"
              onClick={() => void handleDeleteAll()}
            >
              Видалити всі
            </Button>
          )}
        </div>
      </div>

      {skillsLoading && skills.length === 0 ? (
        <LoadingState rows={6} label="Завантаження скілів…" />
      ) : skills.length === 0 ? (
        <EmptyState icon={Sparkles} title="Ще немає скілів" description="Створіть перший скіл, щоб наповнити дерево прокачки." action={<Link href={`/campaigns/${campaignId}/dm/skills/new`}><Button>Створити перший скіл</Button></Link>} />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={groupedSkills.map(([groupName]) => groupName)}
          className="space-y-2 sm:space-y-4"
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

    </div>
  );
}
