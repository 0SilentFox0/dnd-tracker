"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CHARACTER_FORM_TAB, type CharacterFormTabId } from "@/components/characters/character-form-tabs";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterChoicesTab } from "@/components/choices/CharacterChoicesTab";
import { HudForm, HudFormPage, HudSection, type HudTab } from "@/components/hud/form";
import { systemUiOf } from "@/components/systems";
import { Button } from "@/components/ui/button";
import type { CharacterTypeValue } from "@/lib/constants/characters";
import { useCampaignMembers } from "@/lib/hooks/campaigns";
import type { ChoiceRefsView } from "@/lib/hooks/characters";
import { useCharacterForm, useChoiceRefs, useCreateCharacter } from "@/lib/hooks/characters";
import { useClassMode } from "@/lib/hooks/classes";
import { useRaces } from "@/lib/hooks/races";
import { useRuleSystem } from "@/lib/hooks/systems";
import { pruneFormChoices } from "@/lib/utils/characters/choices/prune";

export function NewCharacterForm({ campaignId: id, characterType }: { campaignId: string; characterType: CharacterTypeValue }) {
  const router = useRouter();

  const t = useTranslations("characters");

  const tc = useTranslations("common");

  const create = useCreateCharacter(id);

  const { members, isLoading: membersLoading } = useCampaignMembers(id);

  const { data: races = [] } = useRaces(id);

  const classMode = useClassMode(id);

  const { key: systemKey } = useRuleSystem({ campaignId: id });

  const Ui = systemUiOf(systemKey);

  const refsRef = useRef<ChoiceRefsView | null>(null);

  const {
    status: { isLoading, error },
    formData,
    basicInfo,
    skills,
    abilities,
    actions: { handleSubmit, setFormData },
    ...bindings
  } = useCharacterForm({
    type: characterType,
    recommendScores: classMode.byId,
    onSubmit: async (data) => {
      await create.mutateAsync(refsRef.current?.ready ? pruneFormChoices(data, refsRef.current) : data);
      router.push(`/campaigns/${id}/dm/characters?type=${data.basicInfo.type}`);
    },
  });

  const refs = useChoiceRefs(id, basicInfo.data.race);

  useEffect(() => {
    refsRef.current = refs;
  }, [refs]);

  const raceHasChoices = (races.find((r) => r.name === basicInfo.data.race)?.choices?.length ?? 0) > 0;

  const heroClassMode = classMode.enabled && (basicInfo.data.classes ?? []).some((e) => e.classId);

  const tabs: HudTab<CharacterFormTabId>[] = [
    {
      id: CHARACTER_FORM_TAB.basic,
      label: tc("tabs.basic"),
      content: <CharacterBasicInfo basicInfo={basicInfo} campaignMembers={members} races={races} hideProgression={Ui.hideProgression} classMode={classMode.enabled && !Ui.hideProgression ? classMode : undefined} />,
    },
    {
      id: CHARACTER_FORM_TAB.combat,
      label: t("form.tabs.combat"),
      content: <Ui.StatsFields bindings={{ basicInfo, skills, abilities, ...bindings }} campaignId={id} mode="create" classArmor={classMode.enabled && (basicInfo.data.classes ?? []).length > 0 ? null : undefined} />,
    },
    {
      id: CHARACTER_FORM_TAB.skills,
      label: tc("tabs.abilities"),
      content: (
        <>
          {!Ui.hideProgression && <CharacterSkillsSection skills={skills} />}
          <HudSection title={t("form.sections.personalAbility")}>
            <CharacterAbilitiesSection campaignId={id} abilities={abilities} />
          </HudSection>
        </>
      ),
    },
    ...(raceHasChoices || heroClassMode
      ? [{ id: CHARACTER_FORM_TAB.choices, label: tc("tabs.choices"), content: <CharacterChoicesTab campaignId={id} form={{ data: formData, set: setFormData }} classesEnabled={classMode.enabled} /> }]
      : []),
  ];

  return (
    <HudFormPage title={t("form.title")} aside={t("form.aside")}>
      <HudForm
        id="character-form"
        onSubmit={handleSubmit}
        error={error}
        tabs={tabs}
        actions={
          <>
            <Button type="submit" disabled={isLoading || membersLoading}>
              {isLoading ? tc("actions.creating") : t("form.submit")}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${id}/dm/characters`}>{tc("actions.cancel")}</Link>
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
