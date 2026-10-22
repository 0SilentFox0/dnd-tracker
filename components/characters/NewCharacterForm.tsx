"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CHARACTER_FORM_TAB, type CharacterFormTabId } from "@/components/characters/character-form-tabs";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { HudForm, HudFormPage, HudSection, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import type { CharacterTypeValue } from "@/lib/constants/characters";
import { useCampaignMembers } from "@/lib/hooks/campaigns";
import { useCharacterForm, useCreateCharacter } from "@/lib/hooks/characters";
import { useRaces } from "@/lib/hooks/races";

export function NewCharacterForm({ campaignId: id, characterType }: { campaignId: string; characterType: CharacterTypeValue }) {
  const router = useRouter();

  const create = useCreateCharacter(id);

  const { members, isLoading: membersLoading } = useCampaignMembers(id);

  const { data: races = [] } = useRaces(id);

  const {
    status: { isLoading, error },
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    abilities,
    actions: { handleSubmit },
  } = useCharacterForm({
    type: characterType,
    onSubmit: async (data) => {
      await create.mutateAsync(data);
      router.push(`/campaigns/${id}/dm/characters?type=${data.basicInfo.type}`);
    },
  });

  const tabs: HudTab<CharacterFormTabId>[] = [
    {
      id: CHARACTER_FORM_TAB.basic,
      label: "Основне",
      content: <CharacterBasicInfo basicInfo={basicInfo} campaignMembers={members} races={races} />,
    },
    {
      id: CHARACTER_FORM_TAB.combat,
      label: "Бій",
      content: (
        <>
          <HudSection title="Характеристики">
            <CharacterAbilityScores abilityScores={abilityScores} />
          </HudSection>
          <HudSection title="Бойові параметри">
            <CharacterCombatParams combatStats={combatStats} />
          </HudSection>
        </>
      ),
    },
    {
      id: CHARACTER_FORM_TAB.skills,
      label: "Вміння",
      content: (
        <>
          <CharacterSkillsSection skills={skills} />
          <HudSection title="Персональне вміння">
            <CharacterAbilitiesSection campaignId={id} abilities={abilities} />
          </HudSection>
        </>
      ),
    },
  ];

  return (
    <HudFormPage title="Створити нового персонажа" aside="Заповніть основну інформацію про персонажа">
      <HudForm
        id="character-form"
        onSubmit={handleSubmit}
        error={error}
        tabs={tabs}
        actions={
          <>
            <Button type="submit" disabled={isLoading || membersLoading}>
              {isLoading ? "Створення..." : "Створити персонажа"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${id}/dm/characters`}>Скасувати</Link>
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
