"use client";

import { useMemo,useState } from "react";

import { MainSkillLevels } from "@/components/skill-tree/elements/MainSkillLevels";
import { RacialSkill } from "@/components/skill-tree/elements/RacialSkill";
import { SectorLabel } from "@/components/skill-tree/elements/SectorLabel";
import { SectorLevels } from "@/components/skill-tree/elements/SectorLevels";
import { SegmentSkills } from "@/components/skill-tree/elements/SegmentSkills";
import { UltimateSkillComponent } from "@/components/skill-tree/elements/UltimateSkill";
import { SkillDialogs } from "@/components/skill-tree/ui/SkillDialogs";
import { canLearnMainSkillLevel,getMainSkillLevelId } from "@/components/skill-tree/utils/hooks";
import { useAvailableMainSkills, useRacialSkill } from "@/components/skill-tree/utils/hooks";
import {
  canLearnSkill,
  getCircle2UnlockedCount,
  getCircle4UnlockedCount,
  getLevelStatus,
  isMainSkillFullyUnlocked,
} from "@/components/skill-tree/utils/hooks";
import { SKILL_TREE_CONSTANTS } from "@/components/skill-tree/utils/utils";
import type { Race } from "@/types/races";
import type {
  MainSkill,
  Skill,
  SkillTree,
  UltimateSkill,
} from "@/types/skill-tree";
import {
  SkillCircle as SkillCircleEnum,
  SkillLevel,
} from "@/types/skill-tree";

interface CircularSkillTreeProps {
  skillTree: SkillTree;
  race?: Race | null;
  unlockedSkills?: string[];
  playerLevel?: number;
  isDMMode?: boolean;
  isTrainingCompleted?: boolean;
  onSkillClick?: (skill: Skill) => void;
  onUltimateSkillClick?: (skill: UltimateSkill) => void;
  onRacialSkillClick?: (mainSkill: MainSkill, level: SkillLevel) => void;
  onSkillSlotClick?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    isMainSkillLevel?: boolean; // true для main-skill-level, false/null для звичайного кола
    isRacial?: boolean; // true для racial skill
  }) => void;
  onRemoveSkill?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
  }) => void;
  onSelectSkillForRemoval?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    skillName: string;
  }) => void;
  selectedSkillForRemoval?: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    isMainSkillLevel?: boolean;
    isRacial?: boolean;
  } | null;
  selectedSkillFromLibrary?: string | null;
}

export function CircularSkillTree({
  skillTree,
  race,
  unlockedSkills = [],
  playerLevel = 1,
  isDMMode = false,
  isTrainingCompleted = false,
  onSkillClick,
  onUltimateSkillClick,
  onRacialSkillClick,
  onSkillSlotClick,
  onRemoveSkill,
  onSelectSkillForRemoval,
  selectedSkillForRemoval,
  selectedSkillFromLibrary,
}: CircularSkillTreeProps) {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const [selectedUltimateSkill, setSelectedUltimateSkill] =
    useState<UltimateSkill | null>(null);

  // Отримуємо расовий навик та фільтруємо основні навики
  const racialSkill = useRacialSkill(skillTree);

  const availableMainSkills = useAvailableMainSkills(skillTree, race);

  const sectors = availableMainSkills.length;

  const sectorAngle = (360 / sectors) * (Math.PI / 180); // Конвертуємо в радіани

  const { containerSize, outerRadiusPercent, innerRadiusPercent } =
    SKILL_TREE_CONSTANTS;

  // Підраховуємо кількість прокачаних навиків з кола 4
  const circle4UnlockedCount = getCircle4UnlockedCount(
    skillTree,
    unlockedSkills
  );

  // Обгортки для перевірок з правильними параметрами
  const canLearnSkillWrapper = (skill: Skill) =>
    canLearnSkill(skill, unlockedSkills, skillTree);

  const isMainSkillFullyUnlockedWrapper = (mainSkillId: string) => {
    const mainSkill = skillTree.mainSkills.find((ms) => ms.id === mainSkillId);

    if (!mainSkill) return false;

    return isMainSkillFullyUnlocked(mainSkill, unlockedSkills);
  };

  // Перевірка чи можна вивчити ультимативний навик
  // Ультимативний навик доступний тільки коли є 3 прокачані навики з кола 2
  const canLearnUltimateSkill = useMemo(() => {
    // Перевіряємо чи ультимативний навик вже вивчений
    const isUltimateSkillUnlocked = unlockedSkills.includes(
      skillTree.ultimateSkill.id
    );

    if (isUltimateSkillUnlocked) return false;

    const circle2UnlockedCount = getCircle2UnlockedCount(
      skillTree,
      unlockedSkills
    );

    return circle2UnlockedCount >= 3;
  }, [skillTree, unlockedSkills]);

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
    onSkillClick?.(skill);
  };

  const handleUltimateSkillClick = (skill: UltimateSkill) => {
    setSelectedUltimateSkill(skill);
    onUltimateSkillClick?.(skill);
  };

  const { containerSizeMobile } = SKILL_TREE_CONSTANTS;

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-4 p-0 sm:p-4 w-full">
      {/* Кругове дерево */}
      <div className="w-full max-w-full overflow-visible pb-4 touch-pan-x touch-pan-y mt-24 md:mt-24 -mx-2 sm:mx-0">
        <div
          className="relative border-2 rounded-full bg-gray-600/50 shadow-lg mx-auto skill-tree-container"
          style={{
            width: containerSize,
            height: containerSize,
            minWidth: containerSizeMobile,
            minHeight: containerSizeMobile,
          }}
        >
          {/* Ультимативний навик */}
          <UltimateSkillComponent
            ultimateSkill={skillTree.ultimateSkill}
            unlockedUltimateSkill={unlockedSkills.includes(
              skillTree.ultimateSkill.id
            )}
            canLearnUltimateSkill={canLearnUltimateSkill}
            isDMMode={isDMMode}
            onSkillClick={isDMMode ? undefined : handleUltimateSkillClick}
          />

          {/* Рассовий навик над колом */}
          <RacialSkill
            racialSkill={racialSkill}
            unlockedSkills={unlockedSkills}
            playerLevel={playerLevel}
            isDMMode={isDMMode}
            onRacialSkillClick={
              isDMMode
                ? (mainSkill, level) => {
                    // В DM режимі викликаємо onSkillSlotClick для призначення скілу
                    if (onSkillSlotClick) {
                      onSkillSlotClick({
                        mainSkillId: mainSkill.id,
                        circle: SkillCircleEnum.INNER, // Використовуємо INNER як placeholder для racial
                        level,
                        index: 0,
                        isMainSkillLevel: false,
                        isRacial: true, // Позначаємо що це racial skill
                      });
                    }
                  }
                : onRacialSkillClick
            }
          />

          {/* Рівні секторів - показуємо тільки в режимі Player */}
          <SectorLevels
            mainSkills={availableMainSkills}
            sectorAngle={sectorAngle}
            outerRadiusPercent={outerRadiusPercent}
            innerRadiusPercent={innerRadiusPercent}
          />

          {/* Внутрішнє коло для створення порожнини (бублик) */}
          <div
            className="absolute rounded-full bg-gray-50"
            style={{
              height: `${innerRadiusPercent * 2}%`,
              width: `${innerRadiusPercent * 2}%`,
              left: `${50 - innerRadiusPercent}%`,
              top: `${50 - innerRadiusPercent}%`,
              zIndex: 7,
            }}
          />

          {/* Сектори та навики */}
          {availableMainSkills.map((mainSkill, index) => {
            const startAngle = index * sectorAngle - Math.PI / 2;

            const endAngle = (index + 1) * sectorAngle - Math.PI / 2;

            const midAngle = (startAngle + endAngle) / 2;

            return (
              <div key={mainSkill.id}>
                {/* Назва сектора */}
                {/* <SectorLabel name={mainSkill.name} midAngle={midAngle} /> */}

                {/* Основні навики ЗА колом */}
                <MainSkillLevels
                  mainSkill={mainSkill}
                  midAngle={midAngle}
                  sectorAngle={sectorAngle}
                  unlockedSkills={unlockedSkills}
                  isDMMode={isDMMode}
                  onSelectSkillForRemoval={onSelectSkillForRemoval}
                  selectedSkillForRemoval={selectedSkillForRemoval}
                  onLevelClick={(mainSkill, level) => {
                    // В DM mode викликаємо onSkillSlotClick для призначення скілу
                    if (isDMMode && onSkillSlotClick) {
                      onSkillSlotClick({
                        mainSkillId: mainSkill.id,
                        circle: SkillCircleEnum.INNER, // Використовуємо INNER як placeholder для main-skill-level
                        level,
                        index: 0,
                        isMainSkillLevel: true, // Позначаємо що це main-skill-level
                        isRacial: false,
                      });

                      return;
                    }

                    // Перевіряємо послідовність прокачки: basic -> advanced -> expert
                    const canLearn = canLearnMainSkillLevel(
                      level,
                      mainSkill.id,
                      unlockedSkills
                    );

                    if (!canLearn) {
                      // Не показуємо діалог якщо не можна прокачати
                      return;
                    }

                    // main-skill-level - це окремий навик, який можна прокачати
                    // Створюємо унікальний ID для main-skill-level
                    const mainSkillLevelId = getMainSkillLevelId(
                      mainSkill.id,
                      level
                    );

                    // Створюємо фейковий навик для main-skill-level
                    const levelNames: Record<SkillLevel, string> = {
                      [SkillLevel.BASIC]: "Основи",
                      [SkillLevel.ADVANCED]: "Просунутий",
                      [SkillLevel.EXPERT]: "Експертний",
                    };

                    const mainSkillLevelSkill: Skill = {
                      id: mainSkillLevelId,
                      name: `${mainSkill.name} - ${levelNames[level]}`,
                      description: `Рівень ${level} основного навику ${mainSkill.name}`,
                      circle: SkillCircleEnum.OUTER, // Вважаємо його частиною кола OUTER для логіки
                      level: level,
                    };

                    if (onSkillClick) {
                      onSkillClick(mainSkillLevelSkill);
                    }
                  }}
                />

                {/* Навики в сегменті - показуємо завжди */}
                <SegmentSkills
                  mainSkill={mainSkill}
                  midAngle={midAngle}
                  sectorAngle={sectorAngle}
                  unlockedSkills={unlockedSkills}
                  canLearnSkill={canLearnSkillWrapper}
                  onSkillClick={isDMMode ? undefined : handleSkillClick}
                  onSkillSlotClick={onSkillSlotClick}
                  onRemoveSkill={onRemoveSkill}
                  onSelectSkillForRemoval={onSelectSkillForRemoval}
                  selectedSkillForRemoval={selectedSkillForRemoval}
                  circle4UnlockedCount={circle4UnlockedCount}
                  isDMMode={isDMMode}
                  selectedSkillFromLibrary={selectedSkillFromLibrary}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Діалоги */}
      <SkillDialogs
        selectedSkill={selectedSkill}
        selectedUltimateSkill={selectedUltimateSkill}
        skillTree={skillTree}
        unlockedSkills={unlockedSkills}
        onCloseSkill={() => setSelectedSkill(null)}
        onCloseUltimateSkill={() => setSelectedUltimateSkill(null)}
      />
    </div>
  );
}
