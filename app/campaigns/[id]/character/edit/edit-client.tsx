"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { LoadingState, QueryState } from "@/components/common/states";
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
import { useCharacterEditor } from "@/lib/hooks/characters";

export function PlayerCharacterEditClient({
  campaignId: id,
  characterId,
}: {
  campaignId: string;
  characterId: string;
}) {
  const router = useRouter();

  const { query, ready, form, members, membersLoading, races } = useCharacterEditor({
    campaignId: id,
    characterId,
    onSaved: () => router.push(`/campaigns/${id}/character`),
  });

  const characterLoading = <LoadingState rows={6} label="Завантаження персонажа…" />;

  const { formData, loading, error, basicInfo, abilityScores, combatStats, skills, abilities, spellcasting, handleSubmit } = form;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <QueryState query={query} loading={characterLoading}>
        {() => !ready ? characterLoading : (
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
                <AccordionTrigger>5. Уміння</AccordionTrigger>
                <AccordionContent>
                  <CharacterAbilitiesSection
                    campaignId={id}
                    abilities={abilities}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>6. Артефакти</AccordionTrigger>
                <AccordionContent>
                  <CharacterArtifactsSection
                    knownSpellIds={spellcasting.knownSpells}
                    campaignId={id}
                    progressionCharacterId={characterId}
                    spellSlots={formData.spellcasting.spellSlots}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading || membersLoading}>
                {loading ? "Збереження..." : "Зберегти зміни"}
              </Button>
              <Link href={`/campaigns/${id}/character`}>
                <Button type="button" variant="outline">
                  Скасувати
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
        )}
      </QueryState>
    </div>
  );
}
