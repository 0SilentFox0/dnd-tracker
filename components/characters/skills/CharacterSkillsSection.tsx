/**
 * Компонент для навичок та збережень персонажа
 */

import { DND_SAVING_THROWS, DND_SKILL_META, DND_SKILLS } from "@/lib/constants";
import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";

interface CharacterSkillsSectionProps {
  skills: {
    savingThrows: Record<string, boolean>;
    skills: Record<string, boolean>;
    handlers: {
      toggleSavingThrow: (ability: string) => void;
      toggleSkill: (skill: string) => void;
    };
  };
}

export function CharacterSkillsSection({
  skills: skillsGroup,
}: CharacterSkillsSectionProps) {
  const { savingThrows, skills, handlers } = skillsGroup;
  
  return (
    <div className="space-y-6 w-full">
      <div>
        <h4 className="font-semibold mb-3">Рятівні кидки</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DND_SAVING_THROWS.map((ability) => (
            <label key={ability} className="flex h-11 items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={savingThrows[ability] || false}
                onChange={() => handlers.toggleSavingThrow(ability)}
                className="rounded"
              />
              <span className="text-sm">{CORE_ABILITY_SCORES.find((a) => a.key === ability)?.label ?? ability}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-3">Навички</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DND_SKILLS.map((skill) => (
            <label key={skill} className="flex h-11 items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skills[skill] || false}
                onChange={() => handlers.toggleSkill(skill)}
                className="rounded"
              />
              <span className="text-sm">{DND_SKILL_META[skill].label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
