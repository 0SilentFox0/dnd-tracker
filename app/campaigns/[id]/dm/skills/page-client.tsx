"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";

import { DeleteAllSkillsDialog } from "./__dialogs__/DeleteAllSkillsDialog";

import { SkillGroupAccordion } from "@/components/skills/list/SkillGroupAccordion";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDeleteAll = async () => {
    try {
      await deleteAllSkillsMutation.mutateAsync();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting all skills:", error);
      alert("Не вдалося видалити всі скіли. Спробуйте ще раз.");
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      await deleteSkillMutation.mutateAsync(skillId);
    } catch (error) {
      console.error("Error deleting skill:", error);
      alert("Не вдалося видалити скіл. Спробуйте ще раз.");
    }
  };

  const handleDuplicateSkill = async (skillId: string) => {
    try {
      await duplicateSkillMutation.mutateAsync(skillId);
    } catch (error) {
      console.error("Error duplicating skill:", error);
      alert("Не вдалося дублювати скіл. Спробуйте ще раз.");
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
              onClick={() => setShowDeleteDialog(true)}
            >
              Видалити всі
            </Button>
          )}
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

      <DeleteAllSkillsDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteAll}
        isPending={deleteAllSkillsMutation.isPending}
        skillsCount={skills.length}
      />
    </div>
  );
}
