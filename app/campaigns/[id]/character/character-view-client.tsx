"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterSkillTreeView } from "@/components/characters/abilities/CharacterSkillTreeView";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterDamagePreview } from "@/components/characters/stats/CharacterDamagePreview";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getCharacter, updateCharacter } from "@/lib/api/characters";
import { useCampaignMembers } from "@/lib/hooks/useCampaignMembers";
import { useCharacterForm } from "@/lib/hooks/useCharacterForm";
import { useHeroScalingCoefficients } from "@/lib/hooks/useHeroScalingCoefficients";
import { useRaces } from "@/lib/hooks/useRaces";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";

/** No-op setters for read-only view (satisfies required prop types). */
const noopBasicInfoSetters = {
  setName: () => {},
  setType: () => {},
  setControlledBy: () => {},
  setLevel: () => {},
  setClass: () => {},
  setSubclass: () => {},
  setRace: () => {},
  setSubrace: () => {},
  setAlignment: () => {},
  setBackground: () => {},
  setExperience: () => {},
  setAvatar: () => {},
};

const noopAbilitySetters = {
  setStrength: () => {},
  setDexterity: () => {},
  setConstitution: () => {},
  setIntelligence: () => {},
  setWisdom: () => {},
  setCharisma: () => {},
};

const noopCombatSetters = {
  setArmorClass: () => {},
  setInitiative: () => {},
  setSpeed: () => {},
  setHitDice: () => {},
  setMinTargets: () => {},
  setMaxTargets: () => {},
  setMorale: () => {},
};

const noopSkillHandlers = {
  toggleSavingThrow: () => {},
  toggleSkill: () => {},
};

const noopAbilitiesSetters = {
  setPersonalSkillId: () => {},
};

export function CharacterViewClient({
  campaignId,
  characterId,
  allowPlayerEdit,
}: {
  campaignId: string;
  characterId: string;
  allowPlayerEdit: boolean;
}) {
  const { members } = useCampaignMembers(campaignId);
  const { data: races = [] } = useRaces(campaignId);
  const { coefficients } = useHeroScalingCoefficients(campaignId);

  const [characterLoaded, setCharacterLoaded] = useState(false);
  const [equipped, setEquipped] = useState<EquippedItems>({});

  const [savingTree, setSavingTree] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    formData,
    error,
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    abilities,
    spellcasting,
    setFormData,
  } = useCharacterForm({
    onSubmit: async () => {},
  });

  const { data: artifacts = [] } = useQuery({
    queryKey: ["artifacts", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/artifacts`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!campaignId && characterLoaded,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchCharacter = async () => {
      try {
        const character: Character = await getCharacter(campaignId, characterId);
        if (cancelled) return;
        setFormData(characterToFormData(character));
        setEquipped((character.inventory?.equipped as EquippedItems) ?? {});
        setCharacterLoaded(true);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching character:", err);
          setCharacterLoaded(true);
        }
      }
    };

    fetchCharacter();
    return () => {
      cancelled = true;
    };
  }, [campaignId, characterId, setFormData]);

  const handleSaveSkillTree = async () => {
    setSaveError(null);
    setSavingTree(true);
    try {
      await updateCharacter(campaignId, characterId, {
        skillTreeProgress: formData.skillTreeProgress ?? {},
      });
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSavingTree(false);
    }
  };

  if (!characterLoaded || !formData.basicInfo.name) {
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

  const artifactOptions = artifacts.map(
    (a: { id: string; name: string; slot: string; icon?: string | null }) => ({
      id: a.id,
      name: a.name,
      slot: a.slot ?? "item",
      icon: a.icon ?? null,
    })
  );

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-2xl">{formData.basicInfo.name}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {allowPlayerEdit && (
            <Link href={`/campaigns/${campaignId}/character/edit`}>
              <Button variant="outline">Редагувати повністю</Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="w-full overflow-hidden pt-6">
          {(error || saveError) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline"> {error ?? saveError}</span>
            </div>
          )}

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
                  basicInfo={{ ...basicInfo, setters: noopBasicInfoSetters }}
                  campaignMembers={members}
                  races={races}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>2. Основні характеристики</AccordionTrigger>
              <AccordionContent>
                <CharacterAbilityScores
                  abilityScores={{ ...abilityScores, setters: noopAbilitySetters }}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>3. Бойові параметри</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <CharacterHpPreview
                  level={basicInfo.level}
                  strength={abilityScores.strength}
                  coefficient={coefficients.hpMultiplier}
                  isDm={false}
                />
                <CharacterDamagePreview
                  campaignId={campaignId}
                  characterId={characterId}
                  meleeCoefficient={coefficients.meleeMultiplier}
                  rangedCoefficient={coefficients.rangedMultiplier}
                  isDm={false}
                />
                <CharacterCombatParams
                  combatStats={{ ...combatStats, setters: noopCombatSetters }}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>4. Навички та Збереження</AccordionTrigger>
              <AccordionContent>
                <CharacterSkillsSection
                  skills={{ ...skills, handlers: noopSkillHandlers }}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>5. Уміння</AccordionTrigger>
              <AccordionContent>
                <CharacterAbilitiesSection
                  campaignId={campaignId}
                  abilities={{ ...abilities, setters: noopAbilitiesSetters }}
                />
                <CharacterSkillTreeView
                  campaignId={campaignId}
                  characterRace={basicInfo.race}
                  characterLevel={basicInfo.level}
                  skillTreeProgress={formData.skillTreeProgress ?? {}}
                  onSkillTreeProgressChange={(next) =>
                    setFormData((prev) => ({ ...prev, skillTreeProgress: next }))
                  }
                />
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={handleSaveSkillTree}
                    disabled={savingTree}
                  >
                    {savingTree ? "Збереження..." : "Зберегти дерево скілів"}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>6. Артефакти</AccordionTrigger>
              <AccordionContent>
                <CharacterArtifactsSection
                  knownSpellIds={spellcasting.knownSpells}
                  campaignId={campaignId}
                  characterRace={basicInfo.race}
                  skillTreeProgress={formData.skillTreeProgress ?? {}}
                  equipped={equipped}
                  artifacts={artifactOptions}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
