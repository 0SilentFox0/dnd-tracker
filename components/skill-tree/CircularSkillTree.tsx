"use client";

import { useState } from "react";
import type {
  SkillTree,
  Skill,
  CentralSkill,
  UltimateSkill,
} from "@/lib/types/skill-tree";
import { SKILL_TREE_CONSTANTS } from "./utils";
import { useAvailableMainSkills, useRacialSkill } from "./hooks";
import { CentralSkills } from "./CentralSkills";
import { UltimateSkillComponent } from "./UltimateSkill";
import { SectorLevels } from "./SectorLevels";
import { SectorLabel } from "./SectorLabel";
import { MainSkillLevels } from "./MainSkillLevels";
import { SegmentSkills } from "./SegmentSkills";
import { SkillDialogs } from "./SkillDialogs";
import { RacialSkill } from "./RacialSkill";
import {
  canLearnSkill,
  isMainSkillFullyUnlocked,
} from "./hooks";

interface CircularSkillTreeProps {
  skillTree: SkillTree;
  unlockedSkills?: string[];
  unlockedCentralSkills?: string[];
  unlockedUltimateSkill?: boolean;
  onSkillClick?: (skill: Skill) => void;
  onCentralSkillClick?: (skill: CentralSkill) => void;
  onUltimateSkillClick?: (skill: UltimateSkill) => void;
}

export function CircularSkillTree({
  skillTree,
  unlockedSkills = [],
  unlockedCentralSkills = [],
  unlockedUltimateSkill = false,
  onSkillClick,
  onCentralSkillClick,
  onUltimateSkillClick,
}: CircularSkillTreeProps) {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedCentralSkill, setSelectedCentralSkill] =
    useState<CentralSkill | null>(null);
  const [selectedUltimateSkill, setSelectedUltimateSkill] =
    useState<UltimateSkill | null>(null);

  // Отримуємо расовий навик та фільтруємо основні навики
  const racialSkill = useRacialSkill(skillTree);
  const availableMainSkills = useAvailableMainSkills(skillTree);

  const sectors = availableMainSkills.length;
  const sectorAngle = (360 / sectors) * (Math.PI / 180); // Конвертуємо в радіани
  const { containerSize, outerRadiusPercent, innerRadiusPercent } =
    SKILL_TREE_CONSTANTS;

  // Обгортки для перевірок з правильними параметрами
  const canLearnSkillWrapper = (skill: Skill) =>
    canLearnSkill(skill, unlockedSkills);

  const isMainSkillFullyUnlockedWrapper = (mainSkillId: string) => {
    const mainSkill = skillTree.mainSkills.find((ms) => ms.id === mainSkillId);
    if (!mainSkill) return false;
    return isMainSkillFullyUnlocked(mainSkill, unlockedSkills);
  };

  // Перевірка чи можна вивчити центральний навик
  const canLearnCentralSkill = (centralSkill: CentralSkill) => {
    return (
      isMainSkillFullyUnlockedWrapper(centralSkill.requiredMainSkillId) &&
      !unlockedCentralSkills.includes(centralSkill.id)
    );
  };

  // Перевірка чи можна вивчити ультимативний навик
  const canLearnUltimateSkill = () => {
    if (unlockedUltimateSkill) return false;
    const unlockedCount =
      skillTree.ultimateSkill.requiredCentralSkillIds.filter((id) =>
        unlockedCentralSkills.includes(id)
      ).length;
    return unlockedCount >= 3;
  };

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
    onSkillClick?.(skill);
  };

  const handleCentralSkillClick = (skill: CentralSkill) => {
    setSelectedCentralSkill(skill);
    onCentralSkillClick?.(skill);
  };

  const handleUltimateSkillClick = (skill: UltimateSkill) => {
    setSelectedUltimateSkill(skill);
    onUltimateSkillClick?.(skill);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Кругове дерево */}
      <div
        className="relative border-2 rounded-full bg-gray-50 shadow-lg"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Центральні навики */}
        <CentralSkills
          centralSkills={skillTree.centralSkills}
          unlockedCentralSkills={unlockedCentralSkills}
          canLearnCentralSkill={canLearnCentralSkill}
          onSkillClick={handleCentralSkillClick}
        />

        {/* Ультимативний навик */}
        <UltimateSkillComponent
          ultimateSkill={skillTree.ultimateSkill}
          unlockedUltimateSkill={unlockedUltimateSkill}
          canLearnUltimateSkill={canLearnUltimateSkill()}
          onSkillClick={handleUltimateSkillClick}
        />

        {/* Назва раси в центрі */}
        <div
          className="absolute pointer-events-none text-white text-xs font-bold"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            marginTop: "-12%",
            textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
            zIndex: 12,
          }}
        >
          {skillTree.race}
        </div>

        {/* Рассовий навик в правому верхньому куті */}
        <RacialSkill
          racialSkill={racialSkill}
          unlockedSkills={unlockedSkills}
        />

        {/* Рівні секторів */}
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
              <SectorLabel name={mainSkill.name} midAngle={midAngle} />

              {/* Основні навики ЗА колом */}
              <MainSkillLevels
                mainSkill={mainSkill}
                midAngle={midAngle}
                sectorAngle={sectorAngle}
                unlockedSkills={unlockedSkills}
              />

              {/* Навики в сегменті */}
              <SegmentSkills
                mainSkill={mainSkill}
                midAngle={midAngle}
                sectorAngle={sectorAngle}
                unlockedSkills={unlockedSkills}
                canLearnSkill={canLearnSkillWrapper}
                onSkillClick={handleSkillClick}
              />
            </div>
          );
        })}
      </div>

      {/* Діалоги */}
      <SkillDialogs
        selectedSkill={selectedSkill}
        selectedCentralSkill={selectedCentralSkill}
        selectedUltimateSkill={selectedUltimateSkill}
        skillTree={skillTree}
        unlockedSkills={unlockedSkills}
        unlockedCentralSkills={unlockedCentralSkills}
        isMainSkillFullyUnlocked={isMainSkillFullyUnlockedWrapper}
        onCloseSkill={() => setSelectedSkill(null)}
        onCloseCentralSkill={() => setSelectedCentralSkill(null)}
        onCloseUltimateSkill={() => setSelectedUltimateSkill(null)}
      />
    </div>
  );
}
