"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterSpellsSection } from "@/components/characters/spells/CharacterSpellsSection";
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
import { getCharacter, updateCharacter } from "@/lib/api/characters";
import { useCampaignMembers } from "@/lib/hooks/useCampaignMembers";
import { useCharacterForm } from "@/lib/hooks/useCharacterForm";
import { useRaces } from "@/lib/hooks/useRaces";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";

export default function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>;
}) {
  const { id, characterId } = use(params);

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
    spellcasting,
    handleSubmit,
    setFormData,
  } = useCharacterForm({
    onSubmit: async (data) => {
      await updateCharacter(id, characterId, data);
      router.push(`/campaigns/${id}/dm/characters`);
    },
  });

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const character: Character = await getCharacter(id, characterId);

        const formDataFromCharacter = characterToFormData(character);

        setFormData(formDataFromCharacter);
      } catch (err) {
        console.error("Error fetching character:", err);
      }
    };

    fetchCharacter();
  }, [id, characterId, setFormData]);

  if (loading && !formData.basicInfo.name) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Завантаження...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>
            Редагувати персонажа: {formData.basicInfo.name || "Завантаження..."}
          </CardTitle>
          <CardDescription>Оновіть інформацію про персонажа</CardDescription>
        </CardHeader>
        <CardContent className="w-full overflow-hidden">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="space-y-6 w-full flex flex-col"
          >
            <Accordion
              type="single"
              defaultValue="item-1"
              collapsible
              className="space-y-4"
            >
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

              <AccordionItem value="item-2">
                <AccordionTrigger>2. Основні характеристики</AccordionTrigger>
                <AccordionContent>
                  <CharacterAbilityScores abilityScores={abilityScores} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>3. Бойові параметри</AccordionTrigger>
                <AccordionContent>
                  <CharacterCombatParams combatStats={combatStats} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>4. Навички та Збереження</AccordionTrigger>
                <AccordionContent>
                  <CharacterSkillsSection skills={skills} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>5. Заклинання</AccordionTrigger>
                <AccordionContent>
                  <CharacterSpellsSection
                    spellcasting={spellcasting}
                    campaignId={id}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>6. Артефакти</AccordionTrigger>
                <AccordionContent>
                  <CharacterArtifactsSection
                    knownSpellIds={spellcasting.knownSpells}
                    campaignId={id}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading || membersLoading}>
                {loading ? "Збереження..." : "Зберегти зміни"}
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={async (e) => {
                  e.preventDefault();

                  if (
                    confirm(
                      `Підняти рівень персонажа ${basicInfo.name}? (Рівень ${basicInfo.level} → ${basicInfo.level + 1})`,
                    )
                  ) {
                    try {
                      const response = await fetch(
                        `/api/campaigns/${id}/characters/${characterId}/level-up`,
                        {
                          method: "POST",
                        },
                      );

                      if (!response.ok) {
                        const error = await response.json();

                        alert(error.error || "Помилка при піднятті рівня");

                        return;
                      }

                      const updatedCharacter = await response.json();

                      const updatedFormData =
                        characterToFormData(updatedCharacter);

                      setFormData(updatedFormData);

                      if (updatedCharacter.levelUpDetails) {
                        const details = updatedCharacter.levelUpDetails;

                        alert(
                          `Рівень піднято! ${details.abilityIncreased}: +1, HP: +${details.hpGain}, Додано магічні слоти.`,
                        );
                      }

                      router.refresh();
                    } catch (err) {
                      console.error("Error leveling up:", err);
                      alert("Помилка при піднятті рівня");
                    }
                  }
                }}
              >
                Підняти рівень ({basicInfo.level} → {basicInfo.level + 1})
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
