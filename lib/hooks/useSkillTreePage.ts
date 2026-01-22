import { useState, useMemo, useEffect } from "react";
import type {
  SkillTree,
  Skill,
  UltimateSkill,
  MainSkill,
} from "@/types/skill-tree";
import { SkillLevel } from "@/types/skill-tree";
import {
  canLearnRacialSkillLevel,
  getRacialSkillLevelId,
} from "@/components/skill-tree/hooks";
import { useSkills } from "@/lib/hooks/useSkills";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import { useSkillTreeSave } from "@/lib/hooks/useSkillTreeSave";
import { clearSkillTree } from "@/lib/hooks/useSkillTreeClear";
import { useSkillTreeEnrichment } from "@/lib/hooks/useSkillTreeEnrichment";
import { useSkillTreeFilters } from "@/lib/hooks/useSkillTreeFilters";
import { assignSkillToSlot } from "@/lib/hooks/useSkillTreeAssignment";
import { createMockSkillTree } from "@/lib/utils/skill-tree-mock";

import type { Race } from "@/types/races";

interface UseSkillTreePageOptions {
  campaignId: string;
  skillTrees: (
    | SkillTree
    | {
        id: string;
        campaignId: string;
        race: string;
        skills: unknown;
        createdAt: Date;
      }
  )[];
  races?: Race[];
  defaultRace?: string;
}

// Конвертуємо Prisma формат в наш формат
function convertPrismaToSkillTree(prismaTree: {
  id: string;
  campaignId: string;
  race: string;
  skills: unknown;
  createdAt: Date;
}): SkillTree | null {
  try {
    const skillsData = prismaTree.skills as
      | SkillTree
      | { mainSkills?: SkillTree["mainSkills"] };

    if ((skillsData as SkillTree).mainSkills) {
      // Вже правильний формат
      return skillsData as SkillTree;
    } else if (
      (skillsData as { mainSkills?: SkillTree["mainSkills"] }).mainSkills
    ) {
      // Prisma формат з mainSkills
      const data = skillsData as {
        mainSkills: SkillTree["mainSkills"];
        ultimateSkill?: SkillTree["ultimateSkill"];
      };
      return {
        id: prismaTree.id,
        campaignId: prismaTree.campaignId,
        race: prismaTree.race,
        mainSkills: data.mainSkills,
        centralSkills: [],
        ultimateSkill:
          data.ultimateSkill ||
          ({
            id: `${prismaTree.race}_ultimate`,
            name: "Ультимативний навик",
            description:
              "Могутній навик, доступний після вивчення 3 навиків з кола 2",
          } as UltimateSkill),
        createdAt: prismaTree.createdAt,
      };
    }
  } catch (error) {
    console.error("Error converting skill tree:", error);
  }
  return null;
}

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
  const { data: skillsFromLibrary = [], error: skillsError, isLoading: skillsLoading } =
    useSkills(campaignId);
  
  // Отримуємо основні навики (використовуємо для створення мокового дерева)
  const { data: mainSkills = [] } = useMainSkills(campaignId);

  // Логуємо помилки та стан завантаження для дебагу
  useEffect(() => {
    if (skillsError) {
      console.error("Error loading skills:", skillsError);
    }
    if (skillsLoading) {
      console.log("Loading skills...");
    }
    if (skillsFromLibrary.length > 0) {
      console.log(`Loaded ${skillsFromLibrary.length} skills from library:`, skillsFromLibrary.map(s => s.name));
    } else if (!skillsLoading && !skillsError) {
      console.warn("No skills found in library. Make sure skills are created in the skills library.");
    }
  }, [skillsError, skillsLoading, skillsFromLibrary]);

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

  // Використовуємо editedSkillTree якщо він є, інакше baseSkillTree
  const currentSkillTree = editedSkillTree || baseSkillTree;

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

  // Знаходимо об'єкт раси для обраної раси
  const selectedRaceObject = useMemo(() => {
    return races.find((r) => r.name === selectedRace) || null;
  }, [races, selectedRace]);

  // Хук для фільтрації та групування
  const { availableSkills, groupedSkills } = useSkillTreeFilters({
    skillTree: enrichedSkillTree,
    skillsFromLibrary,
    selectedRace,
    race: selectedRaceObject,
    mainSkills,
  });

  const handleSkillClick = (skill: Skill) => {
    // Перевіряємо чи навик вже вивчений
    if (unlockedSkills.includes(skill.id)) {
      // Якщо вивчений - видаляємо
      setUnlockedSkills((prev) => prev.filter((id) => id !== skill.id));
      return;
    }

    // Перевіряємо чи не перевищено ліміт навиків
    if (unlockedSkills.length >= maxSkills) {
      alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);
      return;
    }

    // Додаємо навик
    setUnlockedSkills((prev) => [...prev, skill.id]);
  };

  const handleUltimateSkillClick = (skill: UltimateSkill) => {
    // Перевіряємо чи навик вже вивчений
    if (unlockedSkills.includes(skill.id)) {
      // Якщо вивчений - видаляємо
      setUnlockedSkills((prev) => prev.filter((id) => id !== skill.id));
      return;
    }

    // Перевіряємо чи не перевищено ліміт навиків
    if (unlockedSkills.length >= maxSkills) {
      alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);
      return;
    }

    // Додаємо ультимативний навик
    setUnlockedSkills((prev) => [...prev, skill.id]);
  };

  const handleRacialSkillClick = (mainSkill: MainSkill, level: SkillLevel) => {
    // Перевіряємо послідовність прокачки: basic -> advanced -> expert
    const canLearn = canLearnRacialSkillLevel(
      level,
      mainSkill.id,
      unlockedSkills
    );

    if (!canLearn) {
      // Не додаємо навик якщо не можна прокачати
      return;
    }

    // Створюємо унікальний ID для расового навику рівня
    const racialSkillLevelId = getRacialSkillLevelId(mainSkill.id, level);

    // Перевіряємо чи навик вже вивчений
    if (unlockedSkills.includes(racialSkillLevelId)) {
      // Якщо вивчений - видаляємо
      setUnlockedSkills((prev) =>
        prev.filter((id) => id !== racialSkillLevelId)
      );
      return;
    }

    // Перевіряємо чи не перевищено ліміт навиків
    if (unlockedSkills.length >= maxSkills) {
      alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);
      return;
    }

    // Додаємо навик
    setUnlockedSkills((prev) => [...prev, racialSkillLevelId]);
  };

  const handleCompleteTraining = () => {
    if (unlockedSkills.length === 0) {
      alert("Спочатку виберіть навики для прокачки");
      return;
    }
    setIsTrainingCompleted(true);
  };

  const handleSkillSlotClick = (slot: {
    mainSkillId: string;
    circle: 1 | 2 | 3;
    level: string;
    index: number;
  }) => {
    if (!selectedSkillFromLibrary) {
      alert("Спочатку виберіть скіл з бібліотеки");
      return;
    }

    // Знаходимо вибраний скіл з бібліотеки
    const selectedSkill = skillsFromLibrary.find(
      (s) => s.id === selectedSkillFromLibrary
    );

    if (!selectedSkill) {
      alert("Помилка: скіл не знайдено в бібліотеці");
      return;
    }

    if (!currentSkillTree) {
      alert("Помилка: дерево прокачки не знайдено");
      return;
    }

    // Використовуємо хук для присвоєння скіла
    const updatedSkillTree = assignSkillToSlot(
      currentSkillTree,
      slot,
      selectedSkill
    );

    setEditedSkillTree(updatedSkillTree);

    // Показуємо нотифікацію про успішне присвоєння
    const isMainSkillLevelOrRacial = slot.circle === 1 && slot.index === 0;
    if (isMainSkillLevelOrRacial) {
      alert(
        `Скіл "${selectedSkill.name}" успішно присвоєно до ${
          slot.mainSkillId === "racial"
            ? "расового навику"
            : `основного навику "${slot.mainSkillId}"`
        }`
      );
    } else {
      alert(
        `Скіл "${selectedSkill.name}" успішно присвоєно колу ${slot.circle}`
      );
    }

    // Очищаємо селектор
    setSelectedSkillFromLibrary(null);
  };

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
    mainSkills,
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
