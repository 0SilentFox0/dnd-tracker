"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Printer, Sparkles } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { SkillGroupAccordion } from "@/components/skills/list/SkillGroupAccordion";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useSkillsList } from "@/lib/hooks/skills";

export function DMSkillsPageClient({ campaignId }: { campaignId: string }) {
  const t = useTranslations("skills.page");

  const { skills, isLoading, search, groups, actions } = useSkillsList(campaignId);

  const groupNames = groups.map((g) => g.name);

  const newSkillHref = `/campaigns/${campaignId}/dm/skills/new`;

  return (
    <HudPage>
      <HudPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="skills" />
            <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={`/campaigns/${campaignId}/dm/main-skills`}>{t("newMainSkill")}</Link>
            </Button>
            <Button className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={newSkillHref}>{t("newSkill")}</Link>
            </Button>
            {skills.length > 0 && (
              <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
                <Link href={`/campaigns/${campaignId}/dm/print/skills`} target="_blank" rel="noopener noreferrer">
                  <Printer className="h-4 w-4 mr-1" />
                  {t("print")}
                </Link>
              </Button>
            )}
            <DeleteAllButton
              count={skills.length}
              noun={t("deleteAllNouns")}
              confirm={{ description: t("deleteAllDescription", { count: skills.length }) }}
              actions={{ onConfirm: actions.removeAll }}
            />
          </>
        }
      />
      <OnboardingHint id="dm.skills" />

      {isLoading && skills.length === 0 ? (
        <LoadingState rows={6} label={t("loading")} />
      ) : skills.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button asChild>
              <Link href={newSkillHref}>{t("createFirst")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <SearchInput value={search.query.value} onChange={search.query.set} label={t("searchLabel")} placeholder={t("searchPlaceholder")} />
          {groups.length === 0 ? (
            <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />
          ) : (
            <Accordion key={search.isActive ? groupNames.join("|") : "all"} type="multiple" defaultValue={groupNames} className="space-y-2">
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
        </>
      )}
    </HudPage>
  );
}
