"use client";

import { CircularSkillTree } from "@/components/skill-tree/CircularSkillTree";
import { SkillLibrarySelector } from "@/components/skill-tree/SkillLibrarySelector";
import { TrainingCompletion } from "@/components/skill-tree/TrainingCompletion";
import { TrainingCompletedMessage } from "@/components/skill-tree/TrainingCompletedMessage";
import type { SkillTree, Skill, UltimateSkill, MainSkill } from "@/types/skill-tree";
import { SkillLevel } from "@/types/skill-tree";
import type { SkillFromLibrary } from "@/lib/hooks/useSkills";
import type { Race } from "@/types/races";
import type { MainSkill as MainSkillType } from "@/types/main-skills";

interface SkillTreeContentProps {
  enrichedSkillTree: SkillTree | null;
  selectedRace: string;
  race?: Race | null;
  mainSkills?: MainSkillType[];
  isDMMode: boolean;
  isTrainingCompleted: boolean;
  playerLevel: number;
  maxSkills: number;
  unlockedSkills: string[];
  availableSkills: unknown[];
  groupedSkills: {
    groups: Record<string, SkillFromLibrary[]>;
    ungrouped: SkillFromLibrary[];
  };
  selectedSkillFromLibrary: string | null;
  onSkillClick?: (skill: Skill) => void;
  onUltimateSkillClick?: (skill: UltimateSkill) => void;
  onRacialSkillClick?: (mainSkill: MainSkill, level: SkillLevel) => void;
  onSkillSlotClick?: (slot: {
    mainSkillId: string;
    circle: 1 | 2 | 3;
    level: string;
    index: number;
  }) => void;
  onSkillSelect: (skillId: string | null) => void;
  onComplete?: () => void;
}

export function SkillTreeContent({
  enrichedSkillTree,
  selectedRace,
  race,
  mainSkills = [],
  isDMMode,
  isTrainingCompleted,
  playerLevel,
  maxSkills,
  unlockedSkills,
  availableSkills,
  groupedSkills,
  selectedSkillFromLibrary,
  onSkillClick,
  onUltimateSkillClick,
  onRacialSkillClick,
  onSkillSlotClick,
  onSkillSelect,
  onComplete,
}: SkillTreeContentProps) {
  return (
    <div className="space-y-4">
      {/* Кнопка завершення навчання для гравця */}
      {!isDMMode && !isTrainingCompleted && (
        <TrainingCompletion
          unlockedSkillsCount={unlockedSkills.length}
          maxSkills={maxSkills}
          onComplete={() => {}}
        />
      )}

      {/* Повідомлення про завершене навчання */}
      {!isDMMode && isTrainingCompleted && <TrainingCompletedMessage />}

      {/* Селектор для вибору скіла з бібліотеки (тільки в режимі DM) */}
      {isDMMode && (
        <SkillLibrarySelector
          skills={availableSkills as unknown as SkillFromLibrary[]}
          groupedSkills={groupedSkills}
          mainSkills={mainSkills}
          selectedSkillId={selectedSkillFromLibrary}
          onSkillSelect={onSkillSelect}
        />
      )}

      {/* Кругове дерево */}
      {enrichedSkillTree ? (
        <CircularSkillTree
          skillTree={enrichedSkillTree}
          race={race}
          unlockedSkills={unlockedSkills}
          playerLevel={playerLevel}
          isDMMode={isDMMode}
          isTrainingCompleted={isTrainingCompleted}
          onSkillClick={isDMMode ? undefined : onSkillClick}
          onUltimateSkillClick={isDMMode ? undefined : onUltimateSkillClick}
          onRacialSkillClick={isDMMode ? undefined : onRacialSkillClick}
          onSkillSlotClick={onSkillSlotClick}
          selectedSkillFromLibrary={selectedSkillFromLibrary}
        />
      ) : (
        <div className="text-center text-gray-500 py-8">
          Дерево прокачки для раси &quot;{selectedRace}&quot; не знайдено
        </div>
      )}
    </div>
  );
}
