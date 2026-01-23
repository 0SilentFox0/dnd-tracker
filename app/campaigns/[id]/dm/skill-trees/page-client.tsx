"use client";

import Link from "next/link";

import { SkillTreeCard } from "@/components/skill-tree/core/SkillTreeCard";
import { SkillTreeContent } from "@/components/skill-tree/core/SkillTreeContent";
import { SkillTreeHeader } from "@/components/skill-tree/core/SkillTreeHeader";
import { Button } from "@/components/ui/button";
import type { SkillFromLibrary } from "@/lib/hooks/useSkills";
import { useSkillTreePage } from "@/lib/hooks/useSkillTreePage";
import type { Race } from "@/types/races";
import type { SkillTree } from "@/types/skill-tree";

type SkillTreeData =
  | SkillTree
  | {
      id: string;
      campaignId: string;
      race: string;
      skills: unknown;
      createdAt: Date;
    };

interface SkillTreePageClientProps {
  campaignId: string;
  skillTrees: SkillTreeData[];
  races?: Race[];
}

type GroupedSkills = {
  groups: Record<string, SkillFromLibrary[]>;
  ungrouped: SkillFromLibrary[];
};

export function SkillTreePageClient({
  campaignId,
  skillTrees,
  races = [],
}: SkillTreePageClientProps) {
  // Отримуємо назви рас
  const raceNames = races.length > 0
    ? races.map((r) => r.name)
    : Array.from(new Set(skillTrees.map((st) => st.race)));

  // Визначаємо першу расу для вибору за замовчуванням
  const defaultRace = raceNames.length > 0 
    ? raceNames[0] 
    : skillTrees[0]?.race || "";

  const {
    selectedRace,
    unlockedSkills,
    isDMMode,
    isTrainingCompleted,
    selectedSkillFromLibrary,
    playerLevel,
    maxSkills,
    enrichedSkillTree,
    availableSkills,
    groupedSkills,
    mainSkills,
    hasUnsavedChanges,
    isSaving,
    setSelectedRace,
    setIsDMMode,
    handleSave,
    handleClearAll,
    handleSkillClick,
    handleUltimateSkillClick,
    handleRacialSkillClick,
    handleCompleteTraining,
    handleSkillSlotClick,
    setSelectedSkillFromLibrary,
  } = useSkillTreePage({ campaignId, skillTrees, races, defaultRace });

  // Якщо немає рас, показуємо повідомлення
  if (races.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
          <h2 className="text-2xl font-bold">Немає рас</h2>
          <p className="text-muted-foreground max-w-md">
            Для використання дерева прокачки спочатку додайте раси в розділі &quot;Ігрові Раси&quot;.
          </p>
          <Link href={`/campaigns/${campaignId}/dm/races`}>
            <Button>Додати раси</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <SkillTreeCard
        isDMMode={isDMMode}
        playerLevel={playerLevel}
        unlockedSkillsCount={unlockedSkills.length}
        maxSkills={maxSkills}
      >
        {/* Тогл DM/Player та вибір раси */}
        <SkillTreeHeader
          selectedRace={selectedRace}
          races={raceNames}
          isDMMode={isDMMode}
          hasUnsavedChanges={hasUnsavedChanges}
          onRaceChange={setSelectedRace}
          onDMModeToggle={() => setIsDMMode(!isDMMode)}
          onSave={handleSave}
          isSaving={isSaving}
          onClearAll={isDMMode ? handleClearAll : undefined}
        />

        {/* Основний контент */}
        <SkillTreeContent
          enrichedSkillTree={enrichedSkillTree}
          selectedRace={selectedRace}
          race={
            selectedRace
              ? races.find((r) => r.name === selectedRace) || null
              : null
          }
          mainSkills={mainSkills}
          isDMMode={isDMMode}
          isTrainingCompleted={isTrainingCompleted}
          playerLevel={playerLevel}
          maxSkills={maxSkills}
          unlockedSkills={unlockedSkills}
          availableSkills={availableSkills}
          groupedSkills={groupedSkills as unknown as GroupedSkills}
          selectedSkillFromLibrary={selectedSkillFromLibrary}
          onSkillClick={handleSkillClick}
          onUltimateSkillClick={handleUltimateSkillClick}
          onRacialSkillClick={handleRacialSkillClick}
          onSkillSlotClick={handleSkillSlotClick}
          onSkillSelect={setSelectedSkillFromLibrary}
          onComplete={handleCompleteTraining}
        />
      </SkillTreeCard>
    </div>
  );
}
