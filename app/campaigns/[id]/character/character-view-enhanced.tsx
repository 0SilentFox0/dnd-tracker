"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Book,
  Crown,
  Heart,
  Scroll,
  Shield,
  Sparkles,
  Star,
  Sword,
  TrendingUp,
  Zap,
} from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import { ReadOnlyProvider } from "@/components/ui/read-only-context";
import { getCharacter, updateCharacter } from "@/lib/api/characters";
import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";
import { useCampaignMembers } from "@/lib/hooks/useCampaignMembers";
import { useCharacterForm } from "@/lib/hooks/useCharacterForm";
import { useRaces } from "@/lib/hooks/useRaces";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";

/** No-op setters for read-only view */
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

export function CharacterViewEnhanced({
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
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground animate-pulse">
                Завантаження персонажа...
              </p>
            </div>
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

  const heroHp = getHeroMaxHpBreakdown(
    basicInfo.level,
    abilityScores.strength,
    {
      hpMultiplier: hpMult,
    },
  );

  // Calculate ability modifiers for display
  const getModifier = (score: number) => Math.floor((score - 10) / 2);

  const abilityMods = {
    strength: getModifier(abilityScores.strength),
    dexterity: getModifier(abilityScores.dexterity),
    constitution: getModifier(abilityScores.constitution),
    intelligence: getModifier(abilityScores.intelligence),
    wisdom: getModifier(abilityScores.wisdom),
    charisma: getModifier(abilityScores.charisma),
  };

  return (
    <ReadOnlyProvider value={!allowPlayerEdit}>
      <div className="min-h-screen pb-8">
        {/* Enhanced Hero Header for Player View */}
        {isPlayerView && (
          <div className="relative overflow-hidden bg-gradient-to-b from-primary/20 via-background/95 to-background border-b border-primary/20">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] animate-[shimmer_3s_ease-in-out_infinite]" />
            </div>

            <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 relative">
              {/* Character Portrait & Name */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                {/* Avatar with glow effect */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-chart-2 to-primary rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
                  <div className="relative h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-2xl">
                    {basicInfo.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={basicInfo.avatar}
                        alt={basicInfo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-primary">
                        {basicInfo.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* Level Badge */}
                  <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-2 shadow-lg border-2 border-background">
                    <span className="text-sm font-bold text-primary-foreground">
                      {basicInfo.level}
                    </span>
                  </div>
                </div>

                {/* Character Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <Crown className="h-5 w-5 text-primary animate-pulse" />
                    <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
                      {basicInfo.name}
                    </h1>
                  </div>
                  <p className="text-base sm:text-lg text-muted-foreground mb-3">
                    {[
                      basicInfo.class &&
                        `${basicInfo.class} ${basicInfo.level} рівня`,
                      basicInfo.race,
                      basicInfo.background,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                  {basicInfo.subclass && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                      <Sparkles className="h-4 w-4" />
                      {basicInfo.subclass}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Stats Grid - Mobile Optimized */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  icon={<Heart className="h-5 w-5" />}
                  label="Здоров'я"
                  value={heroHp.total}
                  color="from-red-500 to-rose-600"
                  animate
                />
                <StatCard
                  icon={<Shield className="h-5 w-5" />}
                  label="Клас Броні"
                  value={combatStats.armorClass}
                  color="from-blue-500 to-cyan-600"
                />
                <StatCard
                  icon={<Zap className="h-5 w-5" />}
                  label="Ініціатива"
                  value={
                    combatStats.initiative >= 0
                      ? `+${combatStats.initiative}`
                      : combatStats.initiative
                  }
                  color="from-yellow-500 to-amber-600"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Швидкість"
                  value={`${combatStats.speed} фт`}
                  color="from-green-500 to-emerald-600"
                />
              </div>

              {/* Ability Scores - Compact Mobile View */}
              <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                <AbilityBadge
                  label="СИЛ"
                  score={abilityScores.strength}
                  modifier={abilityMods.strength}
                />
                <AbilityBadge
                  label="ЛОВ"
                  score={abilityScores.dexterity}
                  modifier={abilityMods.dexterity}
                />
                <AbilityBadge
                  label="ВИТ"
                  score={abilityScores.constitution}
                  modifier={abilityMods.constitution}
                />
                <AbilityBadge
                  label="ІНТ"
                  score={abilityScores.intelligence}
                  modifier={abilityMods.intelligence}
                />
                <AbilityBadge
                  label="МУД"
                  score={abilityScores.wisdom}
                  modifier={abilityMods.wisdom}
                />
                <AbilityBadge
                  label="ХАР"
                  score={abilityScores.charisma}
                  modifier={abilityMods.charisma}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6">
          {/* Edit Mode Header */}
          {allowPlayerEdit && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {formData.basicInfo.name}
              </h1>
              <Link href={`/campaigns/${campaignId}/character/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-manipulation"
                >
                  Редагувати повністю
                </Button>
              </Link>
            </div>
          )}

          {/* Error Display */}
          {(error || saveError) && (
            <Card className="mb-6 border-destructive/50 bg-destructive/10">
              <CardContent className="py-4">
                <p className="text-sm text-destructive">
                  <strong>Помилка:</strong> {error ?? saveError}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Accordion Sections */}
          <Accordion
            type="single"
            defaultValue={isPlayerView ? "item-5" : "item-1"}
            collapsible
            className="space-y-3"
          >
            {/* Section 1: Basic Info */}
            <AccordionItem
              value="item-1"
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-primary/40"
            >
              <AccordionTrigger className="min-h-[48px] px-4 py-3 text-left font-semibold hover:no-underline group">
                <div className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span>Загальна інформація</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <CharacterBasicInfo
                  basicInfo={{ ...basicInfo, setters: noopBasicInfoSetters }}
                  campaignMembers={members}
                  races={races}
                  isPlayerView={isPlayerView}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Ability Scores */}
            <AccordionItem
              value="item-2"
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-primary/40"
            >
              <AccordionTrigger className="min-h-[48px] px-4 py-3 text-left font-semibold hover:no-underline group">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span>Основні характеристики</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <CharacterAbilityScores
                  abilityScores={{
                    ...abilityScores,
                    setters: noopAbilitySetters,
                  }}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Section 3: Combat Stats */}
            <AccordionItem
              value="item-3"
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-primary/40"
            >
              <AccordionTrigger className="min-h-[48px] px-4 py-3 text-left font-semibold hover:no-underline group">
                <div className="flex items-center gap-2">
                  <Sword className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span>Бойові параметри</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 px-4 pb-4 pt-2">
                <CharacterHpPreview
                  level={basicInfo.level}
                  strength={abilityScores.strength}
                  coefficient={formData.scalingCoefficients?.hpMultiplier ?? 1}
                  isDm={false}
                />
                <CharacterDamagePreview
                  campaignId={campaignId}
                  characterId={characterId}
                  meleeCoefficient={
                    formData.scalingCoefficients?.meleeMultiplier ?? 1
                  }
                  rangedCoefficient={
                    formData.scalingCoefficients?.rangedMultiplier ?? 1
                  }
                  isDm={false}
                />
                <CharacterCombatParams
                  combatStats={{ ...combatStats, setters: noopCombatSetters }}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Section 4: Skills */}
            <AccordionItem
              value="item-4"
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-primary/40"
            >
              <AccordionTrigger className="min-h-[48px] px-4 py-3 text-left font-semibold hover:no-underline group">
                <div className="flex items-center gap-2">
                  <Scroll className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span>Навички та збереження</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <CharacterSkillsSection
                  skills={{ ...skills, handlers: noopSkillHandlers }}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Section 5: Abilities - Default open for players */}
            <AccordionItem
              value="item-5"
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-primary/40"
            >
              <AccordionTrigger className="min-h-[48px] px-4 py-3 text-left font-semibold hover:no-underline group">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span>Уміння</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
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
                    className="touch-manipulation w-full sm:w-auto"
                  >
                    {savingTree ? "Збереження…" : "Зберегти дерево скілів"}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 6: Artifacts */}
            <AccordionItem
              value="item-6"
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-primary/40"
            >
              <AccordionTrigger className="min-h-[48px] px-4 py-3 text-left font-semibold hover:no-underline group">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span>Артефакти</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
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
        </div>
      </div>
    </ReadOnlyProvider>
  );
}

// Stat Card Component with animations
function StatCard({
  icon,
  label,
  value,
  color,
  animate = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  animate?: boolean;
}) {
  return (
    <div className={`relative group ${animate ? "animate-pulse-slow" : ""}`}>
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r ${color} rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300`}
      />
      <div className="relative flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-card/90 backdrop-blur-sm p-3 sm:p-4 shadow-lg">
        <div className={`text-white bg-gradient-to-r ${color} p-2 rounded-lg`}>
          {icon}
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Ability Badge Component
function AbilityBadge({
  label,
  score,
  modifier,
}: {
  label: string;
  score: number;
  modifier: number;
}) {
  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-chart-2 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-300" />
      <div className="relative flex flex-col items-center gap-1 rounded-lg border border-primary/30 bg-card/80 backdrop-blur-sm p-2 sm:p-3 shadow-md hover:shadow-lg transition-all">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          {label}
        </span>
        <span className="text-2xl sm:text-3xl font-bold tabular-nums">
          {score}
        </span>
        <span
          className={`text-xs font-semibold tabular-nums ${modifier >= 0 ? "text-green-500" : "text-red-500"}`}
        >
          {modifier >= 0 ? "+" : ""}
          {modifier}
        </span>
      </div>
    </div>
  );
}
