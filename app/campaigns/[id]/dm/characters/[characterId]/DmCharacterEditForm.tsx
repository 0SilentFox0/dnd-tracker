"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QueryClient } from "@tanstack/react-query";

import { DmCharacterEditFormAccordion } from "./DmCharacterEditFormAccordion";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { levelUpCharacter } from "@/lib/api/characters";
import type { useCharacterForm } from "@/lib/hooks/characters";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { CampaignMember } from "@/types/campaigns";
import type { CharacterFormData } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";
import type { Race } from "@/types/races";

type CharacterFormReturn = ReturnType<typeof useCharacterForm>;

export interface DmCharacterEditFormProps {
  campaignId: string;
  characterId: string;
  formData: CharacterFormData;
  setFormData: (
    data: CharacterFormData | ((prev: CharacterFormData) => CharacterFormData),
  ) => void;
  basicInfo: CharacterFormReturn["basicInfo"];
  abilityScores: CharacterFormReturn["abilityScores"];
  combatStats: CharacterFormReturn["combatStats"];
  skills: CharacterFormReturn["skills"];
  abilities: CharacterFormReturn["abilities"];
  spellcasting: CharacterFormReturn["spellcasting"];
  handleSubmit: (e: React.FormEvent) => void;
  error: string | null;
  members: CampaignMember[];
  races: Race[];
  equipped: EquippedItems;
  setEquipped: (
    eq: EquippedItems | ((prev: EquippedItems) => EquippedItems),
  ) => void;
  artifacts: { id: string; name: string; slot: string; icon?: string | null }[];
  loading: boolean;
  membersLoading: boolean;
  queryClient: QueryClient;
}

export function DmCharacterEditForm({
  campaignId,
  characterId,
  formData,
  setFormData,
  basicInfo,
  abilityScores,
  combatStats,
  skills,
  abilities,
  spellcasting,
  handleSubmit,
  error,
  members,
  races,
  equipped,
  setEquipped,
  artifacts,
  loading,
  membersLoading,
  queryClient,
}: DmCharacterEditFormProps) {
  const router = useRouter();

  const handleLevelUp = async () => {
    if (
      !confirm(
        `Підняти рівень персонажа ${basicInfo.name}? (Рівень ${basicInfo.level} → ${basicInfo.level + 1})`,
      )
    ) {
      return;
    }

    try {
      const updatedCharacter = await levelUpCharacter(campaignId, characterId);

      const updatedFormData = characterToFormData(updatedCharacter);

      setFormData(updatedFormData);

      if (updatedCharacter.levelUpDetails) {
        const details = updatedCharacter.levelUpDetails as {
          abilityIncreased?: string;
          hpGain?: number;
        };

        alert(
          `Рівень піднято! ${details.abilityIncreased ?? "Характеристика"}: +1, HP: +${details.hpGain ?? 0}, Додано магічні слоти.`,
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ["character-damage-preview", campaignId, characterId],
      });
      router.refresh();
    } catch (err) {
      console.error("Error leveling up:", err);
      alert("Помилка при піднятті рівня");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Редагувати персонажа: {basicInfo.name || "Завантаження..."}
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
          <DmCharacterEditFormAccordion
            formData={formData}
            setFormData={setFormData}
            basicInfo={basicInfo}
            abilityScores={abilityScores}
            combatStats={combatStats}
            skills={skills}
            abilities={abilities}
            spellcasting={spellcasting}
            campaignId={campaignId}
            characterId={characterId}
            equipped={equipped}
            setEquipped={setEquipped}
            artifacts={artifacts}
            members={members}
            races={races}
          />

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || membersLoading}>
              {loading ? "Збереження..." : "Зберегти зміни"}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={(e) => {
                e.preventDefault();
                void handleLevelUp();
              }}
            >
              Підняти рівень ({basicInfo.level} → {basicInfo.level + 1})
            </Button>
            <Link href={`/campaigns/${campaignId}/dm/characters`}>
              <Button type="button" variant="outline">
                Скасувати
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
