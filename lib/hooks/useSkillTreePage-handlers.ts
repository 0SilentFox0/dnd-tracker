/**
 * Обробники кліків для useSkillTreePage (скіли, слоти, тренування).
 */

import { useCallback } from "react";

import {
  canLearnRacialSkillLevel,
  getRacialSkillLevelId,
} from "@/components/skill-tree/utils/hooks";
import { assignSkillToSlot } from "@/lib/hooks/skills/useSkillTreeAssignment";
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
}: SkillTreePageHandlersParams) {
  const handleSkillClick = useCallback(
    (skill: Skill) => {
      if (unlockedSkills.includes(skill.id)) {
        setUnlockedSkills((prev) => prev.filter((id) => id !== skill.id));

        return;
      }

      if (unlockedSkills.length >= maxSkills) {
        alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);

        return;
      }

      setUnlockedSkills((prev) => [...prev, skill.id]);
    },
    [unlockedSkills, maxSkills, setUnlockedSkills],
  );

  const handleUltimateSkillClick = useCallback(
    (skill: UltimateSkill) => {
      if (unlockedSkills.includes(skill.id)) {
        setUnlockedSkills((prev) => prev.filter((id) => id !== skill.id));

        return;
      }

      if (unlockedSkills.length >= maxSkills) {
        alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);

        return;
      }

      setUnlockedSkills((prev) => [...prev, skill.id]);
    },
    [unlockedSkills, maxSkills, setUnlockedSkills],
  );

  const handleRacialSkillClick = useCallback(
    (mainSkill: MainSkill, level: SkillLevel) => {
      const canLearn = canLearnRacialSkillLevel(
        level,
        mainSkill.id,
        unlockedSkills,
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
        alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);

        return;
      }

      setUnlockedSkills((prev) => [...prev, racialSkillLevelId]);
    },
    [unlockedSkills, maxSkills, setUnlockedSkills],
  );

  const handleCompleteTraining = useCallback(() => {
    if (unlockedSkills.length === 0) {
      alert("Спочатку виберіть навики для прокачки");

      return;
    }

    setIsTrainingCompleted(true);
  }, [unlockedSkills, setIsTrainingCompleted]);

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
        alert("Спочатку виберіть скіл з бібліотеки");

        return;
      }

      const selectedSkill = skillsFromLibrary.find(
        (s) => s.id === selectedSkillFromLibrary,
      );

      if (!selectedSkill) {
        alert("Помилка: скіл не знайдено в бібліотеці");

        return;
      }

      if (!currentSkillTree) {
        alert("Помилка: дерево прокачки не знайдено");

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
        alert(
          `Скіл "${skillDisplayName}" успішно присвоєно ультимативному навику`,
        );
      } else if (isMainSkillLevelOrRacial) {
        alert(
          `Скіл "${skillDisplayName}" успішно присвоєно до ${
            slot.mainSkillId === "racial"
              ? "расового навику"
              : `основного навику "${slot.mainSkillId}"`
          }`,
        );
      } else {
        alert(
          `Скіл "${skillDisplayName}" успішно присвоєно колу ${slot.circle}`,
        );
      }

      setSelectedSkillFromLibrary(null);
    },
    [
      selectedSkillFromLibrary,
      skillsFromLibrary,
      currentSkillTree,
      setEditedSkillTree,
      setSelectedSkillFromLibrary,
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
