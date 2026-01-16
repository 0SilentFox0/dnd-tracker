"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CircularSkillTree } from "@/components/skill-tree/CircularSkillTree";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  SkillTree,
  Skill,
  UltimateSkill,
  MainSkill,
} from "@/lib/types/skill-tree";
import { SkillLevel } from "@/lib/types/skill-tree";
import {
  canLearnRacialSkillLevel,
  getRacialSkillLevelId,
} from "@/components/skill-tree/hooks";
import { useSkills, type SkillFromLibrary } from "@/lib/hooks/useSkills";
import type { Skill as SkillFromLibraryType } from "@/lib/types/skills";
import { SkillTreeHeader } from "@/components/skill-tree/SkillTreeHeader";
import { SkillLibrarySelector } from "@/components/skill-tree/SkillLibrarySelector";
import { TrainingCompletion } from "@/components/skill-tree/TrainingCompletion";
import { TrainingCompletedMessage } from "@/components/skill-tree/TrainingCompletedMessage";

interface SkillTreePageClientProps {
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

export function SkillTreePageClient({
  campaignId,
  skillTrees,
}: SkillTreePageClientProps) {
  const router = useRouter();
  const [selectedRace, setSelectedRace] = useState<string>(
    skillTrees[0]?.race || ""
  );
  const [unlockedSkills, setUnlockedSkills] = useState<string[]>([]);
  const [isDMMode, setIsDMMode] = useState<boolean>(true); // Режим DM/Player
  const [isTrainingCompleted, setIsTrainingCompleted] =
    useState<boolean>(false); // Чи завершено навчання
  const [selectedSkillFromLibrary, setSelectedSkillFromLibrary] = useState<
    string | null
  >(null); // Вибраний скіл з бібліотеки для розміщення

  // Отримуємо скіли з бібліотеки
  const { data: skillsFromLibrary = [], error: skillsError } =
    useSkills(campaignId);

  // Логуємо помилки для дебагу
  if (skillsError) {
    console.error("Error loading skills:", skillsError);
  }

  // Рівень гравця (для тесту 25)
  const playerLevel = 25;
  const maxSkills = playerLevel; // Максимальна кількість навиків = рівень гравця

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
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [baseSkillTrees, setBaseSkillTrees] = useState<SkillTree[]>(convertedTrees);

  // Знаходимо вибране дерево з baseSkillTrees
  const baseSkillTree = useMemo(() => {
    return baseSkillTrees.find((st) => st.race === selectedRace) || null;
  }, [baseSkillTrees, selectedRace]);

  // Використовуємо editedSkillTree якщо він є, інакше baseSkillTree
  const currentSkillTree = editedSkillTree || baseSkillTree;
  
  // Перевіряємо чи є незбережені зміни
  const hasUnsavedChanges = editedSkillTree !== null;
  
  // Функція збереження skill tree
  const handleSave = async () => {
    if (!editedSkillTree || !currentSkillTree) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/skill-trees/${currentSkillTree.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            skills: editedSkillTree,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save skill tree");
      }

      const updatedTree = await response.json();
      
      // Оновлюємо baseSkillTrees з новими даними
      const updatedBaseSkillTrees = baseSkillTrees.map((st) =>
        st.id === updatedTree.id
          ? convertPrismaToSkillTree({
              id: updatedTree.id,
              campaignId: updatedTree.campaignId,
              race: updatedTree.race,
              skills: updatedTree.skills,
              createdAt: new Date(updatedTree.createdAt),
            }) || st
          : st
      ).filter((st): st is SkillTree => st !== null);
      
      setBaseSkillTrees(updatedBaseSkillTrees);
      
      // Очищаємо editedSkillTree
      setEditedSkillTree(null);
      
      // Оновлюємо сторінку для синхронізації даних
      router.refresh();
      
      alert("Дерево прокачки успішно збережено!");
    } catch (error) {
      console.error("Error saving skill tree:", error);
      alert(`Помилка збереження: ${error instanceof Error ? error.message : "Невідома помилка"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Обогачуємо скіли в дереві прокачки даними з бібліотеки (icon, description тощо)
  // Використовуємо editedSkillTree якщо він є, інакше currentSkillTree
  const enrichedSkillTree = useMemo(() => {
    const baseSkillTreeForEnrichment = editedSkillTree || currentSkillTree;
    if (!baseSkillTreeForEnrichment || !skillsFromLibrary.length) {
      return baseSkillTreeForEnrichment;
    }

    // Створюємо Map для швидкого пошуку скілів з бібліотеки
    const skillsMap = new Map(skillsFromLibrary.map((s) => [s.id, s]));

    // Клонуємо дерево та обогачуємо скіли даними з бібліотеки
    const enrichedMainSkills = baseSkillTreeForEnrichment.mainSkills.map((mainSkill) => {
      const enrichedLevels = { ...mainSkill.levels };

      // Обогачуємо скіли на всіх рівнях
      Object.keys(enrichedLevels).forEach((levelKey) => {
        const level = enrichedLevels[levelKey as keyof typeof enrichedLevels];
        const enrichedCircles = { ...level };

        Object.keys(enrichedCircles).forEach((circleKey) => {
          const circleSkills =
            enrichedCircles[circleKey as keyof typeof enrichedCircles];
          const enrichedCircleSkills = circleSkills.map((skill, index) => {
            const skillWithIcon = skill as Skill & { icon?: string };
            
            // Якщо скіл має id з бібліотеки, обогачуємо його даними з бібліотеки
            if (skill.id && skillsMap.has(skill.id)) {
              const librarySkill = skillsMap.get(skill.id)! as SkillFromLibraryType;
              const enrichedSkill: any = {
                id: skill.id,
                name: skill.name,
                description: librarySkill.description || skill.description,
                circle: skill.circle,
                level: skill.level,
              };
              // Пріоритет має icon, який вже є в скілі (якщо він був присвоєний раніше)
              // Якщо icon немає в скілі, використовуємо icon з бібліотеки
              if (skillWithIcon.icon) {
                enrichedSkill.icon = skillWithIcon.icon;
              } else if (librarySkill.icon) {
                enrichedSkill.icon = librarySkill.icon;
              }
              return enrichedSkill as Skill;
            }
            
            // Якщо скіл не з бібліотеки, але має icon (був присвоєний), зберігаємо його
            if (skillWithIcon.icon) {
              return skill;
            }
            
            return skill;
          });

          enrichedCircles[circleKey as keyof typeof enrichedCircles] =
            enrichedCircleSkills;
        });

        enrichedLevels[levelKey as keyof typeof enrichedLevels] =
          enrichedCircles;
      });

      return {
        ...mainSkill,
        levels: enrichedLevels,
      };
    });

    const enrichedTree = {
      ...baseSkillTreeForEnrichment,
      mainSkills: enrichedMainSkills,
    };
    
    return enrichedTree;
  }, [editedSkillTree, currentSkillTree, skillsFromLibrary]);

  // Отримуємо список вже присвоєних скілів для цієї раси
  const assignedSkillIds = useMemo(() => {
    if (!enrichedSkillTree) return new Set<string>();
    const assignedIds = new Set<string>();

    // Проходимо по всіх mainSkills та їх рівнях
    enrichedSkillTree.mainSkills.forEach((mainSkill) => {
      Object.values(mainSkill.levels).forEach((level) => {
        Object.values(level).forEach((circleSkills) => {
          circleSkills.forEach((skill) => {
            // Якщо скіл має id з бібліотеки (не моковий), додаємо його
            // Мокові скіли мають формат: ${mainSkillId}_${level}_circle${circle}_skill${index}
            // Скіли з бібліотеки мають просто id з бібліотеки
            if (
              skill.id &&
              !skill.id.includes("_circle") &&
              !skill.id.includes("_level") &&
              !skill.id.startsWith("placeholder_")
            ) {
              assignedIds.add(skill.id);
            }
          });
        });
      });
      
      // Також перевіряємо levelSkillIds для main-skill-level та racial
      if (mainSkill.levelSkillIds) {
        Object.values(mainSkill.levelSkillIds).forEach((skillId) => {
          if (skillId) {
            assignedIds.add(skillId);
          }
        });
      }
    });

    return assignedIds;
  }, [enrichedSkillTree]);

  // Фільтруємо скіли: прибираємо вже присвоєні та фільтруємо по расам
  const availableSkills = useMemo(() => {
    if (!skillsFromLibrary.length) return [];

    const filtered = skillsFromLibrary.filter((skill) => {
      // Перевіряємо чи скіл вже присвоєний
      if (assignedSkillIds.has(skill.id)) {
        return false;
      }

      // Перевіряємо чи скіл підходить для цієї раси
      // Якщо races порожній або відсутній - скіл доступний для всіх рас
      // Якщо races заповнений - скіл доступний тільки для вказаних рас
      if (skill.races && skill.races.length > 0) {
        const isAvailableForRace = skill.races.includes(selectedRace);
        return isAvailableForRace;
      }

      // Якщо рас не вказано - показуємо для всіх
      return true;
    });

    return filtered;
  }, [skillsFromLibrary, assignedSkillIds, selectedRace]);

  // Групуємо скіли по групам
  const groupedSkills = useMemo(() => {
    const groups: Record<string, typeof availableSkills> = {};
    const ungrouped: typeof availableSkills = [];

    availableSkills.forEach((skill) => {
      // Перевіряємо чи є spellGroup об'єкт або spellGroupId
      const skillWithGroup = skill as unknown as {
        spellGroup?: { id: string; name: string } | null;
        spellGroupId?: string | null;
        spellGroupName?: string;
      };
      const groupId =
        skillWithGroup.spellGroup?.id || skillWithGroup.spellGroupId;
      const groupName =
        skillWithGroup.spellGroup?.name || skillWithGroup.spellGroupName;

      if (groupId && groupName) {
        if (!groups[groupId]) {
          groups[groupId] = [];
        }
        groups[groupId].push(skill);
      } else {
        ungrouped.push(skill);
      }
    });

    return { groups, ungrouped };
  }, [availableSkills]);

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex justify-between gap-2 w-full items-center">
              <span>{isDMMode ? "Редактор Скілів" : "Дерево Прокачки"}</span>
              {!isDMMode && (
                <span className="text-sm font-normal">
                  Рівень {playerLevel} ({unlockedSkills.length}/{maxSkills})
                </span>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {isDMMode
              ? "Налаштування дерев прокачки для рас"
              : "Виберіть навики для прокачки"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Тогл DM/Player та вибір раси */}
          <SkillTreeHeader
            selectedRace={selectedRace}
            races={baseSkillTrees.map((st) => st.race)}
            isDMMode={isDMMode}
            hasUnsavedChanges={hasUnsavedChanges}
            onRaceChange={setSelectedRace}
            onDMModeToggle={() => setIsDMMode(!isDMMode)}
            onSave={handleSave}
            isSaving={isSaving}
          />

          {/* Кнопка завершення навчання для гравця */}
          {!isDMMode && !isTrainingCompleted && (
            <TrainingCompletion
              unlockedSkillsCount={unlockedSkills.length}
              maxSkills={maxSkills}
              onComplete={handleCompleteTraining}
            />
          )}

          {/* Повідомлення про завершене навчання */}
          {!isDMMode && isTrainingCompleted && <TrainingCompletedMessage />}

          {/* Селектор для вибору скіла з бібліотеки (тільки в режимі DM) */}
          {isDMMode && (
            <SkillLibrarySelector
              skills={availableSkills as unknown as SkillFromLibrary[]}
              groupedSkills={
                groupedSkills as unknown as {
                  groups: Record<string, SkillFromLibrary[]>;
                  ungrouped: SkillFromLibrary[];
                }
              }
              selectedSkillId={selectedSkillFromLibrary}
              onSkillSelect={setSelectedSkillFromLibrary}
            />
          )}

          {/* Кругове дерево */}
          {enrichedSkillTree ? (
            <CircularSkillTree
              skillTree={enrichedSkillTree}
              unlockedSkills={unlockedSkills}
              playerLevel={playerLevel}
              isDMMode={isDMMode}
              isTrainingCompleted={isTrainingCompleted}
              onSkillClick={isDMMode ? undefined : handleSkillClick}
              onUltimateSkillClick={
                isDMMode ? undefined : handleUltimateSkillClick
              }
              onRacialSkillClick={isDMMode ? undefined : handleRacialSkillClick}
              onSkillSlotClick={(slot) => {
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

                // Перевіряємо, чи це main-skill-level або racial слот (circle === 1 та index === 0)
                const isMainSkillLevelOrRacial = slot.circle === 1 && slot.index === 0;

                // Для main-skill-level та racial оновлюємо icon для конкретного рівня
                if (isMainSkillLevelOrRacial) {

                  const updatedMainSkills = currentSkillTree.mainSkills.map(
                    (mainSkill) => {
                      if (mainSkill.id !== slot.mainSkillId) {
                        return mainSkill;
                      }

                      // Оновлюємо icon та skillId для конкретного рівня
                      const levelIcons = mainSkill.levelIcons || {};
                      const levelSkillIds = mainSkill.levelSkillIds || {};
                      return {
                        ...mainSkill,
                        levelIcons: {
                          ...levelIcons,
                          [slot.level]: selectedSkill.icon || levelIcons[slot.level as keyof typeof levelIcons],
                        },
                        levelSkillIds: {
                          ...levelSkillIds,
                          [slot.level]: selectedSkill.id,
                        },
                      };
                    }
                  );

                  const updatedSkillTree: SkillTree = {
                    ...currentSkillTree,
                    mainSkills: updatedMainSkills,
                  };

                  setEditedSkillTree(updatedSkillTree);
                  alert(
                    `Скіл "${selectedSkill.name}" успішно присвоєно до ${slot.mainSkillId === "racial" ? "расового навику" : `основного навику "${slot.mainSkillId}"`}`
                  );
                  setSelectedSkillFromLibrary(null);
                  return;
                }

                // Оновлюємо skillTree, призначаючи скіл до відповідного слота
                const updatedMainSkills = currentSkillTree.mainSkills.map(
                  (mainSkill) => {
                    if (mainSkill.id !== slot.mainSkillId) {
                      return mainSkill;
                    }

                    // Оновлюємо рівень, де знаходиться слот
                    const updatedLevels = { ...mainSkill.levels };
                    const levelKey = slot.level;
                    const levelCircles = updatedLevels[levelKey];

                    // Мапінг між UI колами та структурою даних:
                    // UI коло 3 -> circle3, UI коло 2 -> circle2, UI коло 1 -> circle1
                    const circleMapping: Record<1 | 2 | 3, "circle1" | "circle2" | "circle3"> = {
                      1: "circle1",
                      2: "circle2",
                      3: "circle3",
                    };
                    const circleKey = circleMapping[slot.circle] as keyof typeof levelCircles;
                    const circleSkills = levelCircles[circleKey] || [];

                    // Створюємо новий масив скілів з оновленим скілом на позиції slot.index
                    const updatedCircleSkills = [...circleSkills];
                    const skillToAssign: any = {
                      id: selectedSkill.id,
                      name: selectedSkill.name,
                      description: selectedSkill.description || "",
                      circle: slot.circle,
                      level: slot.level,
                    };
                    // Додаємо icon якщо він є (обов'язково зберігаємо icon)
                    if (selectedSkill.icon) {
                      skillToAssign.icon = selectedSkill.icon;
                    }

                    // Замінюємо скіл на позиції slot.index
                    // Якщо індекс більший за довжину масиву, заповнюємо масив до потрібного індексу placeholder'ами
                    // Але зберігаємо всі існуючі скіли
                    while (updatedCircleSkills.length <= slot.index) {
                      // Створюємо порожній скіл-заглушку для заповнення масиву
                      const placeholderSkill: any = {
                        id: `placeholder_${updatedCircleSkills.length}`,
                        name: "",
                        description: "",
                        circle: slot.circle,
                        level: slot.level,
                      };
                      updatedCircleSkills.push(placeholderSkill as Skill);
                    }
                    // Тепер замінюємо скіл на позиції slot.index
                    updatedCircleSkills[slot.index] = skillToAssign as Skill;

                    updatedLevels[levelKey] = {
                      ...levelCircles,
                      [circleKey]: updatedCircleSkills,
                    };

                    return {
                      ...mainSkill,
                      levels: updatedLevels,
                    };
                  }
                );

                // Оновлюємо skillTree
                const updatedSkillTree: SkillTree = {
                  id: currentSkillTree.id,
                  campaignId: currentSkillTree.campaignId,
                  race: currentSkillTree.race,
                  mainSkills: updatedMainSkills,
                  centralSkills: currentSkillTree.centralSkills || [],
                  ultimateSkill: currentSkillTree.ultimateSkill,
                  createdAt: currentSkillTree.createdAt,
                };

                // Оновлюємо стан
                setEditedSkillTree(updatedSkillTree);

                // Показуємо нотифікацію про успішне присвоєння
                alert(
                  `Скіл "${selectedSkill.name}" успішно присвоєно колу ${slot.circle}`
                );

                // Очищаємо селектор
                setSelectedSkillFromLibrary(null);
              }}
              selectedSkillFromLibrary={selectedSkillFromLibrary}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">
              Дерево прокачки для раси &quot;{selectedRace}&quot; не знайдено
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
