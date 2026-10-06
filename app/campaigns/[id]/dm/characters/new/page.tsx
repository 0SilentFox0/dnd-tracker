"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CHARACTER_FORM_TAB, type CharacterFormTabId } from "./character-form-tabs";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { HudForm, HudFormPage, HudSection, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { useCampaignMembers } from "@/lib/hooks/campaigns";
import { useCharacterForm, useCreateCharacter } from "@/lib/hooks/characters";
import { useRaces } from "@/lib/hooks/races";

export default function NewCharacterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  const { id } = use(params);

  const { type } = use(searchParams);

  const characterType: CharacterTypeValue = type === CharacterType.NPC_HERO ? CharacterType.NPC_HERO : CharacterType.PLAYER;

  const router = useRouter();

  const create = useCreateCharacter(id);

  const { members, loading: membersLoading } = useCampaignMembers(id);

  const { data: races = [] } = useRaces(id);

  const {
    loading,
    error,
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    abilities,
    handleSubmit,
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
      {error && (
        <p role="alert" className="mx-4 mt-3 rounded-md border border-[#d0705c]/50 bg-[#d0705c]/10 px-3 py-2 text-sm text-[#f0b4a6]">
          <strong>Помилка:</strong> {error}
        </p>
      )}
      <HudForm
        id="character-form"
        onSubmit={handleSubmit}
        tabs={tabs}
        actions={
          <>
            <Button type="submit" disabled={loading || membersLoading}>
              {loading ? "Створення..." : "Створити персонажа"}
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
