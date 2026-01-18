import type { Skill, MainSkill } from "@/lib/types/skill-tree";
import {
  SkillLevel,
  SkillCircle as SkillCircleEnum,
} from "@/lib/types/skill-tree";
import { SKILL_TREE_CONSTANTS } from "./utils";
import { SkillCircle } from "./SkillCircle";

interface SkillCircleGroupProps {
  skills: Skill[];
  mainSkill: MainSkill;
  circleNumber: SkillCircleEnum;
  midAngle: number;
  sectorAngle: number;
  unlockedSkills: string[];
  canLearnSkill: (skill: Skill) => boolean;
  onSkillClick?: (skill: Skill) => void;
  onSkillSlotClick?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    isMainSkillLevel?: boolean;
    isRacial?: boolean;
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
  circle4UnlockedCount: number;
  mainSkillLevelsUnlocked: number; // Кількість прокачаних main-skill-level
  circle3UnlockedInSector: number;
  circle2UnlockedInSector: number;
  isDMMode?: boolean;
  selectedSkillFromLibrary?: string | null;
}

const CIRCLE_CONFIG: Record<
  SkillCircleEnum,
  {
    angleSpread: number;
    radiusMultiplier: number;
    sizePercent: number;
    getAngleOffset: (
      index: number,
      total: number,
      angleSpread: number
    ) => number;
  }
> = {
  [SkillCircleEnum.OUTER]: {
    angleSpread: 0.6,
    radiusMultiplier: 0.9,
    sizePercent: 6,
    getAngleOffset: (index: number, total: number, angleSpread: number) =>
      ((index - 0.1) / (total - 1 || 1)) * angleSpread,
  },
  [SkillCircleEnum.MIDDLE]: {
    angleSpread: 0.8,
    radiusMultiplier: 0.5,
    sizePercent: 6,
    getAngleOffset: (index: number, _total: number, angleSpread: number) =>
      ((index + 0.15) / 2) * angleSpread,
  },
  [SkillCircleEnum.INNER]: {
    angleSpread: 0.5,
    radiusMultiplier: 1.21,
    sizePercent: 6,
    getAngleOffset: (index: number, _total: number, angleSpread: number) =>
      ((index + 1) / 2) * angleSpread,
  },
};

export function SkillCircleGroup({
  skills,
  mainSkill,
  circleNumber,
  midAngle,
  sectorAngle,
  unlockedSkills,
  canLearnSkill,
  onSkillClick,
  onSkillSlotClick,
  onRemoveSkill,
  onSelectSkillForRemoval,
  selectedSkillForRemoval,
  circle4UnlockedCount,
  mainSkillLevelsUnlocked,
  circle3UnlockedInSector,
  circle2UnlockedInSector,
  isDMMode = false,
  selectedSkillFromLibrary,
}: SkillCircleGroupProps) {
  const { outerRadiusPercent, innerRadiusPercent } = SKILL_TREE_CONSTANTS;
  const config = CIRCLE_CONFIG[circleNumber];

  // В DM режимі відображаємо всі скіли (включно з placeholder), щоб коло завжди залишалося на місці
  // В Player режимі фільтруємо placeholder скіли
  const filteredSkills = isDMMode
    ? skills.map((skill, originalIndex) => ({ skill, originalIndex }))
    : skills
        .map((skill, originalIndex) => ({ skill, originalIndex }))
        .filter(
          ({ skill }) => skill.id && !skill.id.startsWith("placeholder_")
        );

  return (
    <>
      {filteredSkills.map(({ skill, originalIndex }, filteredIndex) => {
        const angleSpread = sectorAngle * config.angleSpread;
        const skillAngleOffset = config.getAngleOffset(
          filteredIndex,
          filteredSkills.length,
          angleSpread
        );
        const skillAngle = midAngle + skillAngleOffset;

        let radiusPercent: number;
        if (circleNumber === SkillCircleEnum.OUTER) {
          radiusPercent = outerRadiusPercent * config.radiusMultiplier;
        } else if (circleNumber === SkillCircleEnum.MIDDLE) {
          radiusPercent =
            (innerRadiusPercent + outerRadiusPercent) * config.radiusMultiplier;
        } else {
          radiusPercent = innerRadiusPercent * config.radiusMultiplier;
        }

        // Перевіряємо чи це placeholder
        const isPlaceholder = !skill.id || skill.id.startsWith("placeholder_");
        const isUnlocked = !isPlaceholder && unlockedSkills.includes(skill.id);

        // Перевіряємо prerequisites спочатку (тільки для не-placeholder скілів)
        const hasPrerequisites = isPlaceholder
          ? true
          : !skill.prerequisites ||
            skill.prerequisites.length === 0 ||
            skill.prerequisites.every((prereq) =>
              unlockedSkills.includes(prereq)
            );

        // Перевіряємо доступність на основі кола та кількості прокачаних навиків
        // Використовуємо circleNumber замість skill.circle для правильної перевірки
        let canLearnThisSkill = false;
        if (circleNumber === SkillCircleEnum.OUTER) {
          // Коло OUTER (3) - можна прокачати стільки навиків, скільки прокачано main-skill-level
          // Наприклад: 1 main-skill-level = 1 навик з кола OUTER, 2 main-skill-level = 2 навики з кола OUTER
          const canLearnMore =
            circle3UnlockedInSector < mainSkillLevelsUnlocked;
          canLearnThisSkill =
            mainSkillLevelsUnlocked > 0 && canLearnMore && hasPrerequisites;
        } else if (circleNumber === SkillCircleEnum.MIDDLE) {
          // Коло MIDDLE (2) - доступне після прокачки 1 навики з кола OUTER
          canLearnThisSkill = circle3UnlockedInSector >= 1 && hasPrerequisites;
        } else if (circleNumber === SkillCircleEnum.INNER) {
          // Коло 1 - доступне після прокачки 1 навики з кола 2 в цьому секторі
          // АЛЕ також потрібно щоб всі 3 рівня main-skill-level були прокачані (basic, advanced, expert)
          const allMainSkillLevelsUnlocked = mainSkillLevelsUnlocked >= 3;
          canLearnThisSkill =
            circle2UnlockedInSector >= 1 &&
            allMainSkillLevelsUnlocked &&
            hasPrerequisites;
        }

        // Для кола 1 (INNER) використовуємо тільки локальну перевірку, оскільки canLearnSkill може мати інші вимоги
        // Для інших кіл також перевіряємо через canLearnSkill для додаткової валідації
        // Для placeholder скілів не перевіряємо canLearnSkill
        const canLearnFromFunction =
          isPlaceholder || circleNumber === SkillCircleEnum.INNER
            ? true
            : canLearnSkill(skill);

        // Для кола 3 (OUTER) пріоритет має локальна перевірка (hasPrerequisites)
        // Для інших кіл використовуємо обидві перевірки
        // В DM mode всі скіли (включно з placeholder) доступні для редагування
        const canLearn = isDMMode
          ? true
          : isPlaceholder
          ? false // Placeholder не можна прокачати в Player режимі
          : circleNumber === SkillCircleEnum.OUTER
          ? canLearnThisSkill && !isUnlocked
          : canLearnThisSkill && canLearnFromFunction && !isUnlocked;

        // Перевіряємо чи цей скіл вибраний для видалення
        // Перевіряємо що це НЕ main-skill-level та НЕ racial (вони мають окремі компоненти)
        const isSelectedForRemoval = selectedSkillForRemoval
          ? selectedSkillForRemoval.mainSkillId === mainSkill.id &&
            selectedSkillForRemoval.circle === circleNumber &&
            selectedSkillForRemoval.level === skill.level &&
            selectedSkillForRemoval.index === originalIndex &&
            selectedSkillForRemoval.isMainSkillLevel !== true && // НЕ main-skill-level
            selectedSkillForRemoval.isRacial !== true // НЕ racial
          : false;

        return (
          <SkillCircle
            key={`circle${circleNumber}-${skill.id}`}
            skill={skill}
            mainSkillId={mainSkill.id}
            circleNumber={circleNumber}
            angle={skillAngle}
            radiusPercent={radiusPercent}
            sizePercent={config.sizePercent}
            isUnlocked={isUnlocked}
            canLearn={canLearn}
            onSkillClick={onSkillClick}
            onSkillSlotClick={onSkillSlotClick}
            onRemoveSkill={onRemoveSkill}
            onSelectSkillForRemoval={onSelectSkillForRemoval}
            isSelectedForRemoval={isSelectedForRemoval}
            skillIndex={originalIndex}
            isDMMode={isDMMode}
            selectedSkillFromLibrary={selectedSkillFromLibrary}
          />
        );
      })}
    </>
  );
}
