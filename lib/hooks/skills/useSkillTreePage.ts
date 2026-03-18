import { useEffect,useMemo, useState } from "react";

import { useMainSkills } from "./useMainSkills";
import { useSkills } from "./useSkills";
import { clearSkillTree } from "./useSkillTreeClear";
import { useSkillTreeEnrichment } from "./useSkillTreeEnrichment";
import { useSkillTreeFilters } from "./useSkillTreeFilters";
import { useSkillTreePageHandlers } from "./useSkillTreePage-handlers";
import {
  getMainSkillsForSelector,
  mergeRaceMainSkillsIntoTree,
} from "./useSkillTreePage-tree";
import type { UseSkillTreePageOptions } from "./useSkillTreePage-types";
import { useSkillTreeSave } from "./useSkillTreeSave";

import {
  convertPrismaToSkillTree,
  createMockSkillTree,
} from "@/lib/utils/skills/skill-tree-mock";
import type { MainSkill } from "@/types/main-skills";
import type { SkillTree } from "@/types/skill-tree";

export function useSkillTreePage({
  campaignId,
  skillTrees,
  races = [],
  defaultRace,
}: UseSkillTreePageOptions) {
  const [selectedRace, setSelectedRace] = useState<string>(
    defaultRace || skillTrees[0]?.race || ""
  );

  const [unlockedSkills, setUnlockedSkills] = useState<string[]>([]);

  const [isDMMode, setIsDMMode] = useState<boolean>(true);

  const [isTrainingCompleted, setIsTrainingCompleted] =
    useState<boolean>(false);

  const [selectedSkillFromLibrary, setSelectedSkillFromLibrary] = useState<
    string | null
  >(null);

  // Отримуємо скіли з бібліотеки
  const { data: skillsFromLibrary = [] } = useSkills(campaignId);
  
  // Отримуємо основні навики (використовуємо для створення мокового дерева)
  const { data: mainSkills = [] } = useMainSkills(campaignId);


  // Рівень гравця (для тесту 25)
  const playerLevel = 25;

  const maxSkills = playerLevel;

  // Конвертуємо всі дерева в правильний формат
  const convertedTrees = useMemo(() => {
    return skillTrees
      .map((st) => {
        if ((st as SkillTree).mainSkills) {
          return st as SkillTree;
        }

        return convertPrismaToSkillTree(
          st as {
            id: string;
            campaignId: string;
            race: string;
            skills: unknown;
            createdAt: Date;
          }
        );
      })
      .filter((st): st is SkillTree => st !== null);
  }, [skillTrees]);

  // Стан для поточного дерева прокачки (може бути оновлено в DM режимі)
  const [editedSkillTree, setEditedSkillTree] = useState<SkillTree | null>(
    null
  );

  const [baseSkillTrees, setBaseSkillTrees] =
    useState<SkillTree[]>(convertedTrees);

  // Синхронізуємо baseSkillTrees з пропсами після зміни skillTrees (наприклад, після router.refresh())
  useEffect(() => {
    setBaseSkillTrees(convertedTrees);
  }, [convertedTrees]);

  // Знаходимо вибране дерево з baseSkillTrees, або створюємо мокове, якщо не знайдено
  const baseSkillTree = useMemo(() => {
    const found = baseSkillTrees.find((st) => st.race === selectedRace);

    if (found) {
      return found;
    }

    // Якщо дерево не знайдено, створюємо мокове для обраної раси
    if (selectedRace) {
      return createMockSkillTree(campaignId, selectedRace, mainSkills);
    }

    return null;
  }, [baseSkillTrees, selectedRace, campaignId, mainSkills]);

  const selectedRaceObject = useMemo(
    () => races.find((r) => r.name === selectedRace) ?? null,
    [races, selectedRace]
  );

  const treeWithRaceMainSkills = useMemo(
    () =>
      mergeRaceMainSkillsIntoTree(
        baseSkillTree,
        selectedRaceObject,
        mainSkills,
      ),
    [baseSkillTree, selectedRaceObject, mainSkills],
  );

  // Використовуємо editedSkillTree якщо він є, інакше дерево з усіма секторами раси
  const currentSkillTree = editedSkillTree || treeWithRaceMainSkills;

  // Перевіряємо чи є незбережені зміни
  const hasUnsavedChanges = editedSkillTree !== null;

  // Хук для збереження
  const { saveSkillTree, isSaving } = useSkillTreeSave({
    campaignId,
    onSuccess: (updatedTree) => {
      // Оновлюємо baseSkillTrees з даними з сервера
      const updatedBaseSkillTrees = baseSkillTrees
        .map((st) => (st.id === updatedTree.id ? updatedTree : st))
        .filter((st): st is SkillTree => st !== null);
      
      // Якщо дерево не знайдено в baseSkillTrees, додаємо його
      if (!baseSkillTrees.find((st) => st.id === updatedTree.id)) {
        updatedBaseSkillTrees.push(updatedTree);
      }
      
      setBaseSkillTrees(updatedBaseSkillTrees);
      setEditedSkillTree(null);
      alert("Дерево прокачки успішно збережено!");
    },
    onError: (error) => {
      console.error("Error saving skill tree:", error);
      alert(
        `Помилка збереження: ${
          error instanceof Error ? error.message : "Невідома помилка"
        }`
      );
    },
  });

  // Функція збереження skill tree
  const handleSave = async () => {
    const treeToSave = editedSkillTree || currentSkillTree;

    if (!treeToSave) {
      return;
    }

    await saveSkillTree(treeToSave);
  };

  // Функція очищення всього дерева
  const handleClearAll = async () => {
    const treeToClear = currentSkillTree || baseSkillTree;

    if (!treeToClear) {
      alert("Помилка: дерево прокачки не знайдено");

      return;
    }

    try {
      const clearedTree = clearSkillTree(treeToClear);

      setEditedSkillTree(clearedTree);

      // Автоматично зберігаємо очищене дерево
      try {
        await saveSkillTree(clearedTree);
        alert("Всі присвоєння скілів успішно видалено та збережено!");
      } catch (saveError) {
        console.error("Помилка збереження після очищення:", saveError);
        alert("Дерево очищено, але не вдалося зберегти зміни");
      }
    } catch (error) {
      console.error("Error clearing skill tree:", error);
      alert("Помилка при очищенні дерева прокачки");
    }
  };

  // Хук для обогачення скілів
  const enrichedSkillTree = useSkillTreeEnrichment({
    skillTree: currentSkillTree,
    skillsFromLibrary,
  });

  const mainSkillsForSelector = useMemo(
    () => getMainSkillsForSelector(mainSkills, campaignId),
    [mainSkills, campaignId],
  );

  // Хук для фільтрації та групування
  const { availableSkills, groupedSkills } = useSkillTreeFilters({
    skillTree: enrichedSkillTree,
    skillsFromLibrary,
    selectedRace,
    race: selectedRaceObject,
    mainSkills: mainSkillsForSelector as MainSkill[],
    skipRaceCheckForSelector: isDMMode,
  });

  const {
    handleSkillClick,
    handleUltimateSkillClick,
    handleRacialSkillClick,
    handleCompleteTraining,
    handleSkillSlotClick,
  } = useSkillTreePageHandlers({
    unlockedSkills,
    setUnlockedSkills,
    maxSkills,
    setEditedSkillTree,
    currentSkillTree,
    selectedSkillFromLibrary,
    skillsFromLibrary,
    setSelectedSkillFromLibrary,
    setIsTrainingCompleted,
  });

  return {
    // State
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
    mainSkills: mainSkillsForSelector,
    hasUnsavedChanges,
    isSaving,

    // Actions
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
  };
}
