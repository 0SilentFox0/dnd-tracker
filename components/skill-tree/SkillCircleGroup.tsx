import type { Skill, MainSkill } from "@/lib/types/skill-tree";
import { SkillLevel } from "@/lib/types/skill-tree";
import { SKILL_TREE_CONSTANTS } from "./utils";
import { SkillCircle } from "./SkillCircle";

interface SkillCircleGroupProps {
  skills: Skill[];
  mainSkill: MainSkill;
  circleNumber: 1 | 2 | 3;
  midAngle: number;
  sectorAngle: number;
  unlockedSkills: string[];
  canLearnSkill: (skill: Skill) => boolean;
  onSkillClick?: (skill: Skill) => void;
  onSkillSlotClick?: (slot: {
    mainSkillId: string;
    circle: 1 | 2 | 3;
    level: SkillLevel;
    index: number;
  }) => void;
  circle4UnlockedCount: number;
  mainSkillLevelsUnlocked: number; // Кількість прокачаних main-skill-level
  circle3UnlockedInSector: number;
  circle2UnlockedInSector: number;
  isDMMode?: boolean;
  selectedSkillFromLibrary?: string | null;
}

const CIRCLE_CONFIG = {
  3: {
    angleSpread: 0.6,
    radiusMultiplier: 0.9,
    sizePercent: 4.5,
    getAngleOffset: (index: number, total: number, angleSpread: number) =>
      ((index - 1) / (total - 1 || 1)) * angleSpread,
  },
  2: {
    angleSpread: 0.7,
    radiusMultiplier: 0.5,
    sizePercent: 4.5,
    getAngleOffset: (index: number, _total: number, angleSpread: number) =>
      ((index - 0.5) / 2) * angleSpread,
  },
  1: {
    angleSpread: 0.01,
    radiusMultiplier: 1.19,
    sizePercent: 4.5,
    getAngleOffset: (index: number, _total: number, angleSpread: number) =>
      ((index + 1) / 2) * angleSpread,
  },
} as const;

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
  circle4UnlockedCount,
  mainSkillLevelsUnlocked,
  circle3UnlockedInSector,
  circle2UnlockedInSector,
  isDMMode = false,
  selectedSkillFromLibrary,
}: SkillCircleGroupProps) {
  const { outerRadiusPercent, innerRadiusPercent } = SKILL_TREE_CONSTANTS;
  const config = CIRCLE_CONFIG[circleNumber];

  // Фільтруємо placeholder скіли, але зберігаємо оригінальні індекси для правильного позиціонування
  const filteredSkills = skills
    .map((skill, originalIndex) => ({ skill, originalIndex }))
    .filter(({ skill }) => skill.id && !skill.id.startsWith("placeholder_"));
  
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
        if (circleNumber === 3) {
          radiusPercent = outerRadiusPercent * config.radiusMultiplier;
        } else if (circleNumber === 2) {
          radiusPercent =
            (innerRadiusPercent + outerRadiusPercent) * config.radiusMultiplier;
        } else {
          radiusPercent = innerRadiusPercent * config.radiusMultiplier;
        }

        const isUnlocked = unlockedSkills.includes(skill.id);

        // Перевіряємо prerequisites спочатку
        const hasPrerequisites =
          !skill.prerequisites ||
          skill.prerequisites.length === 0 ||
          skill.prerequisites.every((prereq) =>
            unlockedSkills.includes(prereq)
          );

        // Перевіряємо доступність на основі кола та кількості прокачаних навиків
        // Використовуємо circleNumber замість skill.circle для правильної перевірки
        let canLearnThisSkill = false;
        if (circleNumber === 3) {
          // Коло 3 - можна прокачати стільки навиків, скільки прокачано main-skill-level
          // Наприклад: 1 main-skill-level = 1 навик з кола 3, 2 main-skill-level = 2 навики з кола 3
          const canLearnMore = circle3UnlockedInSector < mainSkillLevelsUnlocked;
          canLearnThisSkill = mainSkillLevelsUnlocked > 0 && canLearnMore && hasPrerequisites;
        } else if (circleNumber === 2) {
          // Коло 2 - доступне після прокачки 1 навики з кола 3
          canLearnThisSkill = circle3UnlockedInSector >= 1 && hasPrerequisites;
        } else if (circleNumber === 1) {
          // Коло 1 - доступне після прокачки 1 навики з кола 2 в цьому секторі
          // АЛЕ також потрібно щоб всі 3 рівня main-skill-level були прокачані (basic, advanced, expert)
          const allMainSkillLevelsUnlocked = mainSkillLevelsUnlocked >= 3;
          canLearnThisSkill = circle2UnlockedInSector >= 1 && allMainSkillLevelsUnlocked && hasPrerequisites;
        }

        // Для кола 1 використовуємо тільки локальну перевірку, оскільки canLearnSkill може мати інші вимоги
        // Для інших кіл також перевіряємо через canLearnSkill для додаткової валідації
        const canLearnFromFunction = circleNumber === 1 ? true : canLearnSkill(skill);

        // Для кола 3 пріоритет має локальна перевірка (hasPrerequisites)
        // Для інших кіл використовуємо обидві перевірки
        // В DM mode всі скіли доступні для редагування
        const canLearn = isDMMode
          ? true
          : circleNumber === 3
          ? canLearnThisSkill && !isUnlocked
          : canLearnThisSkill && canLearnFromFunction && !isUnlocked;

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
            skillIndex={originalIndex}
            isDMMode={isDMMode}
            selectedSkillFromLibrary={selectedSkillFromLibrary}
          />
        );
      })}
    </>
  );
}
