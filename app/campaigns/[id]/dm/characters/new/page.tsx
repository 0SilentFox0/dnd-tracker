"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createCharacter } from "@/lib/api/characters";
import { useCampaignMembers } from "@/lib/hooks/useCampaignMembers";
import { useCharacterForm } from "@/lib/hooks/useCharacterForm";
import { useRaces } from "@/lib/hooks/useRaces";

export default function NewCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const router = useRouter();

  const { members, loading: membersLoading } = useCampaignMembers(id);

  const { data: races = [] } = useRaces(id);

  const {
    formData,
    loading,
    error,
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    abilities,
    spellcasting,
    handleSubmit,
  } = useCharacterForm({
    onSubmit: async (data) => {
      await createCharacter(id, data);
      router.push(`/campaigns/${id}/dm/characters`);
    },
  });

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Створити нового персонажа</CardTitle>
          <CardDescription>
            Заповніть основну інформацію про персонажа
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full overflow-hidden">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <Accordion type="single" defaultValue="item-1" collapsible>
              {/* Етап 1: Загальна інформація */}
              <AccordionItem value="item-1">
                <AccordionTrigger>1. Загальна інформація</AccordionTrigger>
                <AccordionContent>
                  <CharacterBasicInfo
                    basicInfo={basicInfo}
                    campaignMembers={members}
                    races={races}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 2: Основні характеристики */}
              <AccordionItem value="item-2">
                <AccordionTrigger>2. Основні характеристики</AccordionTrigger>
                <AccordionContent>
                  <CharacterAbilityScores
                    abilityScores={abilityScores}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 3: Бойові параметри */}
              <AccordionItem value="item-3">
                <AccordionTrigger>3. Бойові параметри</AccordionTrigger>
                <AccordionContent>
                  <CharacterCombatParams
                    combatStats={combatStats}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 4: Навички та Збереження */}
              <AccordionItem value="item-4">
                <AccordionTrigger>4. Навички та Збереження</AccordionTrigger>
                <AccordionContent>
                  <CharacterSkillsSection
                    skills={skills}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 5: Уміння */}
              <AccordionItem value="item-5">
                <AccordionTrigger>5. Уміння</AccordionTrigger>
                <AccordionContent>
                  <CharacterAbilitiesSection
                    campaignId={id}
                    abilities={abilities}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 6: Артефакти */}
              <AccordionItem value="item-6">
                <AccordionTrigger>6. Артефакти</AccordionTrigger>
                <AccordionContent>
                  <CharacterArtifactsSection
                    knownSpellIds={spellcasting.knownSpells}
                    campaignId={id}
                    characterRace={basicInfo.race}
                    skillTreeProgress={formData.skillTreeProgress ?? {}}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading || membersLoading}>
                {loading ? "Створення..." : "Створити персонажа"}
              </Button>
              <Link href={`/campaigns/${id}/dm/characters`}>
                <Button type="button" variant="outline">
                  Скасувати
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
