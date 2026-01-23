"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterLanguagesSection } from "@/components/characters/roleplay/CharacterLanguagesSection";
import { CharacterRoleplaySection } from "@/components/characters/roleplay/CharacterRoleplaySection";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterSpellsSection } from "@/components/characters/spells/CharacterSpellsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterImmunities } from "@/components/characters/stats/CharacterImmunities";
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
    spellcasting,
    roleplay,
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

              {/* Етап 5: Магічна Книга */}
              <AccordionItem value="item-5">
                <AccordionTrigger>5. Магічна Книга</AccordionTrigger>
                <AccordionContent>
                  <CharacterSpellsSection
                    spellcasting={spellcasting}
                    campaignId={id}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 6: Мови та Профісії */}
              <AccordionItem value="item-6">
                <AccordionTrigger>6. Мови та Профісії</AccordionTrigger>
                <AccordionContent>
                  <CharacterLanguagesSection
                    roleplay={roleplay}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 7: Імунітети */}
              <AccordionItem value="item-7">
                <AccordionTrigger>7. Імунітети</AccordionTrigger>
                <AccordionContent>
                  <CharacterImmunities
                    roleplay={roleplay}
                    race={
                      basicInfo.race
                        ? races.find((r) => r.name === basicInfo.race) || null
                        : null
                    }
                    raceName={basicInfo.race}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 8: Рольова гра */}
              <AccordionItem value="item-8">
                <AccordionTrigger>8. Рольова гра</AccordionTrigger>
                <AccordionContent>
                  <CharacterRoleplaySection
                    roleplay={roleplay}
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
