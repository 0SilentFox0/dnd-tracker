import type { Skill, MainSkill } from "@/types/skill-tree";
import {
  SKILL_LEVELS,
  SkillLevel,
  SkillCircle as SkillCircleEnum,
} from "@/types/skill-tree";
import { SkillCircleGroup } from "./SkillCircleGroup";

interface SegmentSkillsProps {
  mainSkill: MainSkill;
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
  } | null;
  circle4UnlockedCount: number;
  isDMMode?: boolean;
  selectedSkillFromLibrary?: string | null;
}

export function SegmentSkills({
  mainSkill,
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
  isDMMode = false,
  selectedSkillFromLibrary,
}: SegmentSkillsProps) {
  // Підраховуємо кількість прокачаних main-skill-level
  // main-skill-level має ID формату: ${mainSkill.id}_${level}_level
  const mainSkillLevelsUnlocked = SKILL_LEVELS.filter((level) => {
    const mainSkillLevelId = `${mainSkill.id}_${level}_level`;
    return unlockedSkills.includes(mainSkillLevelId);
  }).length;

  // Підраховуємо кількість прокачаних навиків з кола 3 в цьому секторі
  // Перевіряємо всі рівні кола 3 (circle3 в структурі)
  const circle3UnlockedInSector = SKILL_LEVELS.reduce((count, level) => {
    return (
      count +
      mainSkill.levels[level].circle3.filter((skill) =>
        unlockedSkills.includes(skill.id)
      ).length
    );
  }, 0);

  // Підраховуємо кількість прокачаних навиків з кола 2 в цьому секторі
  // Перевіряємо всі рівні кола 2 (circle2 в структурі)
  const circle2UnlockedInSector = SKILL_LEVELS.reduce((count, level) => {
    return (
      count +
      mainSkill.levels[level].circle2.filter((skill) =>
        unlockedSkills.includes(skill.id)
      ).length
    );
  }, 0);

  return (
    <>
      {/* Коло 3 (OUTER) - 3 навики (найбільша частина сегменту, зовні) - початок прокачки */}
      {/* Навики з кола 3 доступні тільки якщо базовий рівень прокачаний */}
      <SkillCircleGroup
        skills={mainSkill.levels.basic.circle3}
        mainSkill={mainSkill}
        circleNumber={SkillCircleEnum.OUTER}
        midAngle={midAngle}
        sectorAngle={sectorAngle}
        unlockedSkills={unlockedSkills}
        canLearnSkill={canLearnSkill}
        onSkillClick={onSkillClick}
        onSkillSlotClick={onSkillSlotClick}
        onRemoveSkill={onRemoveSkill}
        onSelectSkillForRemoval={onSelectSkillForRemoval}
        selectedSkillForRemoval={selectedSkillForRemoval}
        circle4UnlockedCount={circle4UnlockedCount}
        mainSkillLevelsUnlocked={mainSkillLevelsUnlocked}
        circle3UnlockedInSector={circle3UnlockedInSector}
        circle2UnlockedInSector={circle2UnlockedInSector}
        isDMMode={isDMMode}
        selectedSkillFromLibrary={selectedSkillFromLibrary}
      />

      {/* Коло 2 (MIDDLE) - 2 навики (середня частина сегменту) - відкривається після прокачки 1 навику з кола 3 */}
      <SkillCircleGroup
        skills={mainSkill.levels.basic.circle2}
        mainSkill={mainSkill}
        circleNumber={SkillCircleEnum.MIDDLE}
        midAngle={midAngle}
        sectorAngle={sectorAngle}
        unlockedSkills={unlockedSkills}
        canLearnSkill={canLearnSkill}
        onSkillClick={onSkillClick}
        onSkillSlotClick={onSkillSlotClick}
        onRemoveSkill={onRemoveSkill}
        onSelectSkillForRemoval={onSelectSkillForRemoval}
        selectedSkillForRemoval={selectedSkillForRemoval}
        circle4UnlockedCount={circle4UnlockedCount}
        mainSkillLevelsUnlocked={mainSkillLevelsUnlocked}
        circle3UnlockedInSector={circle3UnlockedInSector}
        circle2UnlockedInSector={circle2UnlockedInSector}
        isDMMode={isDMMode}
        selectedSkillFromLibrary={selectedSkillFromLibrary}
      />

      {/* Коло 1 (INNER) - 1 навик (найменша частина сегменту, всередині) - відкривається після прокачки 1 навику з кола 2 */}
      <SkillCircleGroup
        skills={mainSkill.levels.basic.circle1}
        mainSkill={mainSkill}
        circleNumber={SkillCircleEnum.INNER}
        midAngle={midAngle}
        sectorAngle={sectorAngle}
        unlockedSkills={unlockedSkills}
        canLearnSkill={canLearnSkill}
        onSkillClick={onSkillClick}
        onSkillSlotClick={onSkillSlotClick}
        onRemoveSkill={onRemoveSkill}
        onSelectSkillForRemoval={onSelectSkillForRemoval}
        selectedSkillForRemoval={selectedSkillForRemoval}
        circle4UnlockedCount={circle4UnlockedCount}
        mainSkillLevelsUnlocked={mainSkillLevelsUnlocked}
        circle3UnlockedInSector={circle3UnlockedInSector}
        circle2UnlockedInSector={circle2UnlockedInSector}
        isDMMode={isDMMode}
        selectedSkillFromLibrary={selectedSkillFromLibrary}
      />
    </>
  );
}
