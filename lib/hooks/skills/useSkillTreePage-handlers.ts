/**
 * Обробники кліків для useSkillTreePage (скіли, слоти, тренування).
 */

import { useCallback } from "react";

import { assignSkillToSlot } from "./useSkillTreeAssignment";

import {
  canUnlockRacialSkillSlot,
  getRacialSkillLevelId,
} from "@/components/skill-tree/utils/hooks";
import { useNotify } from "@/lib/hooks/common";
import type {
  MainSkill,
  Skill,
  SkillTree,
  UltimateSkill,
} from "@/types/skill-tree";
import type { SkillLevel } from "@/types/skill-tree";

export interface SkillTreePageHandlersParams {
  unlockedSkills: string[];
  setUnlockedSkills: React.Dispatch<React.SetStateAction<string[]>>;
  maxSkills: number;
  setEditedSkillTree: React.Dispatch<React.SetStateAction<SkillTree | null>>;
  currentSkillTree: SkillTree | null;
  selectedSkillFromLibrary: string | null;
  skillsFromLibrary: Array<{
    id: string;
    basicInfo?: { name?: string };
    name?: string;
  }>;
  setSelectedSkillFromLibrary: (id: string | null) => void;
  setIsTrainingCompleted: (value: boolean) => void;
  isDMMode: boolean;
  playerLevel: number;
}

export function useSkillTreePageHandlers({
  unlockedSkills,
  setUnlockedSkills,
  maxSkills,
  setEditedSkillTree,
  currentSkillTree,
  selectedSkillFromLibrary,
  skillsFromLibrary,
  setSelectedSkillFromLibrary,
  setIsTrainingCompleted,
  isDMMode,
  playerLevel,
}: SkillTreePageHandlersParams) {
  const notify = useNotify();

  const handleSkillClick = useCallback(
    (skill: Skill) => {
      if (unlockedSkills.includes(skill.id)) {
        setUnlockedSkills((prev) => prev.filter((id) => id !== skill.id));

        return;
      }

      if (unlockedSkills.length >= maxSkills) {
        void notify(`Досягнуто максимальну кількість навиків (${maxSkills})`);

        return;
      }

      setUnlockedSkills((prev) => [...prev, skill.id]);
    },
    [unlockedSkills, maxSkills, setUnlockedSkills, notify],
  );

  const handleUltimateSkillClick = useCallback(
    (skill: UltimateSkill) => {
      if (unlockedSkills.includes(skill.id)) {
        setUnlockedSkills((prev) => prev.filter((id) => id !== skill.id));

        return;
      }

      if (unlockedSkills.length >= maxSkills) {
        void notify(`Досягнуто максимальну кількість навиків (${maxSkills})`);

        return;
      }

      setUnlockedSkills((prev) => [...prev, skill.id]);
    },
    [unlockedSkills, maxSkills, setUnlockedSkills, notify],
  );

  const handleRacialSkillClick = useCallback(
    (mainSkill: MainSkill, level: SkillLevel) => {
      const canLearn = canUnlockRacialSkillSlot(
        level,
        mainSkill.id,
        unlockedSkills,
        { characterLevel: playerLevel, isDMMode },
      );

      if (!canLearn) return;

      const racialSkillLevelId = getRacialSkillLevelId(mainSkill.id, level);

      if (unlockedSkills.includes(racialSkillLevelId)) {
        setUnlockedSkills((prev) =>
          prev.filter((id) => id !== racialSkillLevelId),
        );

        return;
      }

      if (unlockedSkills.length >= maxSkills) {
        void notify(`Досягнуто максимальну кількість навиків (${maxSkills})`);

        return;
      }

      setUnlockedSkills((prev) => [...prev, racialSkillLevelId]);
    },
    [unlockedSkills, maxSkills, setUnlockedSkills, playerLevel, isDMMode, notify],
  );

  const handleCompleteTraining = useCallback(() => {
    if (unlockedSkills.length === 0) {
      void notify("Спочатку виберіть навики для прокачки");

      return;
    }

    setIsTrainingCompleted(true);
  }, [unlockedSkills, setIsTrainingCompleted, notify]);

  const handleSkillSlotClick = useCallback(
    (slot: {
      mainSkillId: string;
      circle: 1 | 2 | 3;
      level: string;
      index: number;
      isMainSkillLevel?: boolean;
      isRacial?: boolean;
      isUltimate?: boolean;
    }) => {
      if (!selectedSkillFromLibrary) {
        void notify("Спочатку виберіть скіл з бібліотеки");

        return;
      }

      const selectedSkill = skillsFromLibrary.find(
        (s) => s.id === selectedSkillFromLibrary,
      );

      if (!selectedSkill) {
        void notify("Помилка: скіл не знайдено в бібліотеці");

        return;
      }

      if (!currentSkillTree) {
        void notify("Помилка: дерево прокачки не знайдено");

        return;
      }

      const skillDisplayName =
        selectedSkill.basicInfo?.name ?? selectedSkill.name ?? "";

      const updatedSkillTree = assignSkillToSlot(
        currentSkillTree,
        slot,
        selectedSkill as Parameters<typeof assignSkillToSlot>[2],
      );

      setEditedSkillTree(updatedSkillTree);

      const isMainSkillLevelOrRacial =
        slot.isMainSkillLevel === true || slot.isRacial === true;

      if (slot.isUltimate === true) {
        void notify(`Скіл "${skillDisplayName}" успішно присвоєно ультимативному навику`);
      } else if (isMainSkillLevelOrRacial) {
        void notify(`Скіл "${skillDisplayName}" успішно присвоєно до ${
            slot.mainSkillId === "racial"
              ? "расового навику"
              : `основного навику "${slot.mainSkillId}"`
          }`);
      } else {
        void notify(`Скіл "${skillDisplayName}" успішно присвоєно колу ${slot.circle}`);
      }

      setSelectedSkillFromLibrary(null);
    },
    [
      selectedSkillFromLibrary,
      skillsFromLibrary,
      currentSkillTree,
      setEditedSkillTree,
      setSelectedSkillFromLibrary,
      notify,
    ],
  );

  return {
    handleSkillClick,
    handleUltimateSkillClick,
    handleRacialSkillClick,
    handleCompleteTraining,
    handleSkillSlotClick,
  };
}
