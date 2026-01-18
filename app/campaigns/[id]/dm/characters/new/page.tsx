"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import Link from "next/link";
import { useCharacterForm } from "@/lib/hooks/useCharacterForm";
import { useCampaignMembers } from "@/lib/hooks/useCampaignMembers";
import { useRaces } from "@/lib/hooks/useRaces";
import { createCharacter } from "@/lib/api/characters";
import { CharacterBasicInfo } from "@/components/characters/CharacterBasicInfo";
import { CharacterAbilityScores } from "@/components/characters/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/CharacterCombatParams";
import { CharacterSkillsSection } from "@/components/characters/CharacterSkillsSection";
import { CharacterSpellsSection } from "@/components/characters/CharacterSpellsSection";
import { CharacterLanguagesSection } from "@/components/characters/CharacterLanguagesSection";
import { CharacterRoleplaySection } from "@/components/characters/CharacterRoleplaySection";
import { CharacterImmunities } from "@/components/characters/CharacterImmunities";

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
    updateField,
    toggleSavingThrow,
    toggleSkill,
    addLanguage,
    removeLanguage,
    addKnownSpell,
    removeKnownSpell,
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
                    formData={formData}
                    onUpdate={updateField}
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
                    formData={formData}
                    onUpdate={updateField}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 3: Бойові параметри */}
              <AccordionItem value="item-3">
                <AccordionTrigger>3. Бойові параметри</AccordionTrigger>
                <AccordionContent>
                  <CharacterCombatParams
                    formData={formData}
                    onUpdate={updateField}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 4: Навички та Збереження */}
              <AccordionItem value="item-4">
                <AccordionTrigger>4. Навички та Збереження</AccordionTrigger>
                <AccordionContent>
                  <CharacterSkillsSection
                    formData={formData}
                    onToggleSavingThrow={toggleSavingThrow}
                    onToggleSkill={toggleSkill}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 5: Магічна Книга */}
              <AccordionItem value="item-5">
                <AccordionTrigger>5. Магічна Книга</AccordionTrigger>
                <AccordionContent>
                  <CharacterSpellsSection
                    formData={formData}
                    campaignId={id}
                    onUpdate={updateField}
                    onAddSpell={addKnownSpell}
                    onRemoveSpell={removeKnownSpell}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 6: Мови та Профісії */}
              <AccordionItem value="item-6">
                <AccordionTrigger>6. Мови та Профісії</AccordionTrigger>
                <AccordionContent>
                  <CharacterLanguagesSection
                    formData={formData}
                    onUpdate={updateField}
                    onAddLanguage={addLanguage}
                    onRemoveLanguage={removeLanguage}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 7: Імунітети */}
              <AccordionItem value="item-7">
                <AccordionTrigger>7. Імунітети</AccordionTrigger>
                <AccordionContent>
                  <CharacterImmunities
                    formData={formData}
                    race={
                      formData.race
                        ? races.find((r) => r.name === formData.race) || null
                        : null
                    }
                    onUpdate={updateField}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Етап 8: Рольова гра */}
              <AccordionItem value="item-8">
                <AccordionTrigger>8. Рольова гра</AccordionTrigger>
                <AccordionContent>
                  <CharacterRoleplaySection
                    formData={formData}
                    onUpdate={updateField}
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
