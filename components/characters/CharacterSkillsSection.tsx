/**
 * Компонент для навичок та збережень персонажа
 */

import { DND_SKILLS, DND_SAVING_THROWS } from "@/lib/constants";
import { CharacterFormData } from "@/types/characters";

interface CharacterSkillsSectionProps {
  formData: CharacterFormData;
  onToggleSavingThrow: (ability: string) => void;
  onToggleSkill: (skill: string) => void;
}

export function CharacterSkillsSection({
  formData,
  onToggleSavingThrow,
  onToggleSkill,
}: CharacterSkillsSectionProps) {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h4 className="font-semibold mb-3">Збереження (Saving Throws)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DND_SAVING_THROWS.map((ability) => (
            <label key={ability} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.savingThrows[ability] || false}
                onChange={() => onToggleSavingThrow(ability)}
                className="rounded"
              />
              <span className="text-sm capitalize">{ability}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-3">Навички (Skills)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DND_SKILLS.map((skill) => (
            <label key={skill} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.skills[skill] || false}
                onChange={() => onToggleSkill(skill)}
                className="rounded"
              />
              <span className="text-sm capitalize">
                {skill.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
