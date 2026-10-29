import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { DND_SAVING_THROWS, DND_SKILLS } from "@/lib/constants/skills";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";

interface CharacterSkillsSectionProps {
  skills: CharacterFormBindings["skills"];
}

export function CharacterSkillsSection({
  skills: skillsGroup,
}: CharacterSkillsSectionProps) {
  const t = useTranslations("characters.form.sections");

  const tc = useTranslations("common");

  const { data: { savingThrows, skills }, handlers } = skillsGroup;
  
  return (
    <div className="w-full">
      <HudSection title={t("savingThrows")}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DND_SAVING_THROWS.map((ability) => (
            <label key={ability} className="flex h-11 items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={savingThrows[ability] || false}
                onChange={() => handlers.toggleSavingThrow(ability)}
                className="rounded"
              />
              <span className="text-sm">{tc(`abilities.${ability}.label`)}</span>
            </label>
          ))}
        </div>
      </HudSection>

      <HudSection title={t("skills")}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DND_SKILLS.map((skill) => (
            <label key={skill} className="flex h-11 items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skills[skill] || false}
                onChange={() => handlers.toggleSkill(skill)}
                className="rounded"
              />
              <span className="text-sm">{tc(`dndSkills.${skill}`)}</span>
            </label>
          ))}
        </div>
      </HudSection>
    </div>
  );
}
