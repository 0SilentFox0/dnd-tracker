"use client";

import {
  SelectGroup,
  SelectItem,
  SelectLabel,
} from "@/components/ui/select";
import { SelectField } from "@/components/ui/select-field";
import type { SkillFromLibrary } from "@/lib/hooks/useSkills";
import type { MainSkill } from "@/types/main-skills";

interface SkillLibrarySelectorProps {
  skills: SkillFromLibrary[];
  groupedSkills: {
    groups: Record<string, SkillFromLibrary[]>;
    ungrouped: SkillFromLibrary[];
  };
  mainSkills?: MainSkill[];
  selectedSkillId: string | null;
  onSkillSelect: (skillId: string | null) => void;
}

export function SkillLibrarySelector({
  skills,
  groupedSkills,
  mainSkills = [],
  selectedSkillId,
  onSkillSelect,
}: SkillLibrarySelectorProps) {
  const hasGroups = Object.keys(groupedSkills.groups).length > 0;

  const hasUngrouped = groupedSkills.ungrouped.length > 0;

  return (
    <div className="bg-blue-50 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md p-4 space-y-3">
      <div className="text-sm font-semibold text-blue-800 dark:text-blue-200">
        Виберіть скіл з бібліотеки, потім клікніть на коло для призначення
      </div>
      <SelectField
        value={selectedSkillId || ""}
        onValueChange={(skillId) => {
          onSkillSelect(skillId || null);
        }}
        placeholder="Виберіть скіл з бібліотеки"
        triggerClassName="w-full"
      >
        {skills.length === 0 ? (
          <SelectItem value="no-skills" disabled>
            Немає доступних скілів в бібліотеці
          </SelectItem>
        ) : (
          <>
            {/* Групи скілів по основним навикам */}
            {hasGroups &&
              Object.entries(groupedSkills.groups).map(([mainSkillId, groupSkills]) => {
                const mainSkill = mainSkills.find((ms) => ms.id === mainSkillId);

                const groupName = mainSkill?.name || `Група ${mainSkillId}`;

                return (
                  <SelectGroup key={mainSkillId}>
                    <SelectLabel>{groupName}</SelectLabel>
                    {groupSkills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            
            {/* Скіли без групи */}
            {hasUngrouped && (
              <>
                {hasGroups && (
                  <SelectGroup>
                    <SelectLabel>Без групи</SelectLabel>
                    {groupedSkills.ungrouped.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {!hasGroups && groupedSkills.ungrouped.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.name}
                  </SelectItem>
                ))}
              </>
            )}
          </>
        )}
      </SelectField>
      {selectedSkillId && (
        <div className="text-xs text-blue-700 dark:text-blue-300">
          Вибрано: {skills.find((s) => s.id === selectedSkillId)?.name || "Невідомо"}
          <br />
          Клікніть на коло для призначення скіла
        </div>
      )}
    </div>
  );
}
