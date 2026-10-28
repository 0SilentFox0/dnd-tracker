"use client";

import Link from "next/link";
import { Printer, Sparkles } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { SkillGroupAccordion } from "@/components/skills/list/SkillGroupAccordion";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useSkillsList } from "@/lib/hooks/skills";
import { pluralUk } from "@/lib/utils/common/plural";

const SKILL_NOUNS: [string, string, string] = ["скіл", "скіли", "скілів"];

export function DMSkillsPageClient({ campaignId }: { campaignId: string }) {
  const { skills, isLoading, groups, actions } = useSkillsList(campaignId);

  const newSkillHref = `/campaigns/${campaignId}/dm/skills/new`;

  return (
    <HudPage>
      <HudPageHeader
        title="Бібліотека Скілів"
        subtitle="Управління скілами та їх ефектами"
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="skills" />
            <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={`/campaigns/${campaignId}/dm/main-skills`}>+ Основний навик</Link>
            </Button>
            <Button className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={newSkillHref}>+ Створити скіл</Link>
            </Button>
            {skills.length > 0 && (
              <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
                <Link href={`/campaigns/${campaignId}/dm/print/skills`} target="_blank" rel="noopener noreferrer">
                  <Printer className="h-4 w-4 mr-1" />
                  Версія для друку
                </Link>
              </Button>
            )}
            <DeleteAllButton
              count={skills.length}
              nouns={SKILL_NOUNS}
              confirm={{ description: `Ця дія видалить всі скіли з бібліотеки (${skills.length} ${pluralUk(skills.length, SKILL_NOUNS)}). Цю дію неможливо скасувати.` }}
              actions={{ onConfirm: actions.removeAll }}
            />
          </>
        }
      />
      <OnboardingHint id="dm.skills" />

      {isLoading && skills.length === 0 ? (
        <LoadingState rows={6} label="Завантаження скілів…" />
      ) : skills.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Ще немає скілів"
          description="Створіть перший скіл, щоб наповнити дерево прокачки."
          action={
            <Button asChild>
              <Link href={newSkillHref}>Створити перший скіл</Link>
            </Button>
          }
        />
      ) : (
        <Accordion type="multiple" defaultValue={groups.map((g) => g.name)} className="space-y-2">
          {groups.map((group) => (
            <SkillGroupAccordion
              key={group.name}
              groupName={group.name}
              skills={group.skills}
              campaignId={campaignId}
              spellGroups={[]}
              mainSkillColor={group.color}
              actions={{ onDelete: actions.deleteSkill, onDuplicate: actions.duplicateSkill }}
            />
          ))}
        </Accordion>
      )}
    </HudPage>
  );
}
