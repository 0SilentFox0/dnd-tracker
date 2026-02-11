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
import { ReadOnlyProvider } from "@/components/ui/read-only-context";
import { getCharacter, updateCharacter } from "@/lib/api/characters";
import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";
import { useCampaignMembers } from "@/lib/hooks/useCampaignMembers";
import { useCharacterForm } from "@/lib/hooks/useCharacterForm";
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
        const character: Character = await getCharacter(
          campaignId,
          characterId,
        );

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
    }),
  );

  const isPlayerView = !allowPlayerEdit;

  const hpMult = formData.scalingCoefficients?.hpMultiplier ?? 1;

  const heroHp = getHeroMaxHpBreakdown(basicInfo.level, abilityScores.strength, {
    hpMultiplier: hpMult,
  });

  return (
    <ReadOnlyProvider value={!allowPlayerEdit}>
      <div className="min-h-screen pb-8 container mx-auto max-w-3xl md:px-4 py-4 sm:px-6 sm:py-6 md:max-w-4xl">
        {/* Player view: hero block with quick stats */}
        {isPlayerView && (
          <Card className="mb-6 overflow-hidden border-primary/20 bg-linear-to-br from-card to-card/80 shadow-lg">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:shrink-0">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-primary/30 bg-muted sm:h-24 sm:w-24">
                    {basicInfo.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={basicInfo.avatar}
                        alt={basicInfo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                        {basicInfo.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 sm:text-center">
                    <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {basicInfo.name}
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {[
                        basicInfo.class && `рівень ${basicInfo.level}`,
                        basicInfo.class,
                        basicInfo.race,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end sm:gap-3">
                  <QuickStat label="AC" value={combatStats.armorClass} />
                  <QuickStat label="HP" value={heroHp.total} />
                  <QuickStat label="Ініц." value={combatStats.initiative} />
                  <QuickStat label="Швидк." value={`${combatStats.speed} фт`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header row when editing or as secondary actions */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {allowPlayerEdit && (
            <>
              <CardTitle className="text-xl sm:text-2xl">
                {formData.basicInfo.name}
              </CardTitle>
              <Link href={`/campaigns/${campaignId}/character/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-manipulation"
                >
                  Редагувати повністю
                </Button>
              </Link>
            </>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="w-full overflow-x-auto pt-4 sm:pt-6">
            {(error || saveError) && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <strong>Помилка:</strong> {error ?? saveError}
              </div>
            )}

            <Accordion
              type="single"
              defaultValue="item-1"
              collapsible
              className="space-y-2 sm:space-y-3"
            >
              <AccordionItem
                value="item-1"
                className="rounded-xl border bg-card/75"
              >
                <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
                  1. Загальна інформація
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1">
                  <CharacterBasicInfo
                    basicInfo={{ ...basicInfo, setters: noopBasicInfoSetters }}
                    campaignMembers={members}
                    races={races}
                    isPlayerView={isPlayerView}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="rounded-xl border bg-card/75"
              >
                <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
                  2. Основні характеристики
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1">
                  <CharacterAbilityScores
                    abilityScores={{
                      ...abilityScores,
                      setters: noopAbilitySetters,
                    }}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="rounded-xl border bg-card/75"
              >
                <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
                  3. Бойові параметри
                </AccordionTrigger>
                <AccordionContent className="space-y-6 px-4 pb-4 pt-1">
                <CharacterHpPreview
                  level={basicInfo.level}
                  strength={abilityScores.strength}
                  coefficient={formData.scalingCoefficients?.hpMultiplier ?? 1}
                  isDm={false}
                />
                <CharacterDamagePreview
                  campaignId={campaignId}
                  characterId={characterId}
                  meleeCoefficient={formData.scalingCoefficients?.meleeMultiplier ?? 1}
                  rangedCoefficient={formData.scalingCoefficients?.rangedMultiplier ?? 1}
                  isDm={false}
                />
                  <CharacterCombatParams
                    combatStats={{ ...combatStats, setters: noopCombatSetters }}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="rounded-xl border bg-card/75"
              >
                <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
                  4. Навички та збереження
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1">
                  <CharacterSkillsSection
                    skills={{ ...skills, handlers: noopSkillHandlers }}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-5"
                className="rounded-xl border bg-card/75"
              >
                <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
                  5. Уміння
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1">
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
                      setFormData((prev) => ({
                        ...prev,
                        skillTreeProgress: next,
                      }))
                    }
                  />
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={handleSaveSkillTree}
                      disabled={savingTree}
                      className="touch-manipulation"
                    >
                      {savingTree ? "Збереження…" : "Зберегти дерево скілів"}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-6"
                className="rounded-xl border bg-card/75"
              >
                <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
                  6. Артефакти
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1">
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
    </ReadOnlyProvider>
  );
}

function QuickStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/50 px-3 py-2 tabular-nums sm:px-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-semibold text-foreground sm:text-lg">
        {value}
      </span>
    </div>
  );
}
