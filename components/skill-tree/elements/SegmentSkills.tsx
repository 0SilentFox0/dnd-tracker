import { SkillCircleGroup } from "@/components/skill-tree/elements/SkillCircleGroup";
import type { MainSkill,Skill } from "@/types/skill-tree";
import {
  SKILL_LEVELS,
  SkillCircle as SkillCircleEnum,
  SkillLevel,
} from "@/types/skill-tree";

interface SkillSlot {
  mainSkillId: string;
  circle: SkillCircleEnum;
  level: SkillLevel;
  index: number;
  isMainSkillLevel?: boolean;
  isRacial?: boolean;
  skillName?: string;
}

interface SegmentSkillsCallbacks {
  onSkillClick?: (skill: Skill) => void;
  onSkillSlotClick?: (slot: SkillSlot) => void;
  onRemoveSkill?: (slot: SkillSlot) => void;
  onSelectSkillForRemoval?: (slot: SkillSlot & { skillName: string }) => void;
}

interface SegmentSkillsState {
  unlockedSkills: string[];
  selectedSkillForRemoval?: SkillSlot | null;
  selectedSkillFromLibrary?: string | null;
}

interface SegmentSkillsGeometry {
  midAngle: number;
  sectorAngle: number;
}

interface SegmentSkillsCounts {
  circle4UnlockedCount: number;
}

interface SegmentSkillsProps {
  mainSkill: MainSkill;
  geometry: SegmentSkillsGeometry;
  state: SegmentSkillsState;
  callbacks: SegmentSkillsCallbacks;
  counts: SegmentSkillsCounts;
  canLearnSkill: (skill: Skill) => boolean;
  isDMMode?: boolean;
}

export function SegmentSkills({
  mainSkill,
  geometry,
  state,
  callbacks,
  counts,
  canLearnSkill,
  isDMMode = false,
}: SegmentSkillsProps) {
  const { midAngle, sectorAngle } = geometry;

  const { unlockedSkills, selectedSkillForRemoval, selectedSkillFromLibrary } = state;

  const { onSkillClick, onSkillSlotClick, onRemoveSkill, onSelectSkillForRemoval } = callbacks;

  const { circle4UnlockedCount } = counts;

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
        geometry={{ midAngle, sectorAngle }}
        state={{
          unlockedSkills,
          selectedSkillForRemoval,
          selectedSkillFromLibrary,
        }}
        callbacks={{
          onSkillClick,
          onSkillSlotClick,
          onRemoveSkill,
          onSelectSkillForRemoval,
        }}
        counts={{
          circle4UnlockedCount,
          mainSkillLevelsUnlocked,
          circle3UnlockedInSector,
          circle2UnlockedInSector,
        }}
        config={{
          canLearnSkill,
          isDMMode,
        }}
      />

      {/* Коло 2 (MIDDLE) - 2 навики (середня частина сегменту) - відкривається після прокачки 1 навику з кола 3 */}
      <SkillCircleGroup
        skills={mainSkill.levels.basic.circle2}
        mainSkill={mainSkill}
        circleNumber={SkillCircleEnum.MIDDLE}
        geometry={{ midAngle, sectorAngle }}
        state={{
          unlockedSkills,
          selectedSkillForRemoval,
          selectedSkillFromLibrary,
        }}
        callbacks={{
          onSkillClick,
          onSkillSlotClick,
          onRemoveSkill,
          onSelectSkillForRemoval,
        }}
        counts={{
          circle4UnlockedCount,
          mainSkillLevelsUnlocked,
          circle3UnlockedInSector,
          circle2UnlockedInSector,
        }}
        config={{
          canLearnSkill,
          isDMMode,
        }}
      />

      {/* Коло 1 (INNER) - 1 навик (найменша частина сегменту, всередині) - відкривається після прокачки 1 навику з кола 2 */}
      <SkillCircleGroup
        skills={mainSkill.levels.basic.circle1}
        mainSkill={mainSkill}
        circleNumber={SkillCircleEnum.INNER}
        geometry={{ midAngle, sectorAngle }}
        state={{
          unlockedSkills,
          selectedSkillForRemoval,
          selectedSkillFromLibrary,
        }}
        callbacks={{
          onSkillClick,
          onSkillSlotClick,
          onRemoveSkill,
          onSelectSkillForRemoval,
        }}
        counts={{
          circle4UnlockedCount,
          mainSkillLevelsUnlocked,
          circle3UnlockedInSector,
          circle2UnlockedInSector,
        }}
        config={{
          canLearnSkill,
          isDMMode,
        }}
      />
    </>
  );
}
