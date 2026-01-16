"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SkillFromLibrary } from "@/lib/hooks/useSkills";

interface SkillLibrarySelectorProps {
  skills: SkillFromLibrary[];
  groupedSkills: {
    groups: Record<string, SkillFromLibrary[]>;
    ungrouped: SkillFromLibrary[];
  };
  selectedSkillId: string | null;
  onSkillSelect: (skillId: string | null) => void;
}

export function SkillLibrarySelector({
  skills,
  groupedSkills,
  selectedSkillId,
  onSkillSelect,
}: SkillLibrarySelectorProps) {
  console.log("SkillLibrarySelector - skills:", skills);
  console.log("SkillLibrarySelector - groupedSkills:", groupedSkills);
  console.log("SkillLibrarySelector - selectedSkillId:", selectedSkillId);

  const hasGroups = Object.keys(groupedSkills.groups).length > 0;
  const hasUngrouped = groupedSkills.ungrouped.length > 0;

  return (
    <div className="bg-blue-50 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md p-4 space-y-3">
      <div className="text-sm font-semibold text-blue-800 dark:text-blue-200">
        Виберіть скіл з бібліотеки, потім клікніть на коло для призначення
      </div>
      <Select
        value={selectedSkillId || ""}
        onValueChange={(skillId) => {
          const selectedSkill = skills.find((s) => s.id === skillId);
          console.log("=== Skill selected from dropdown ===");
          console.log("Skill ID:", skillId);
          console.log("Full skill object:", selectedSkill);
          if (selectedSkill) {
            console.log("Skill name:", selectedSkill.name);
            console.log("Skill description:", selectedSkill.description);
            console.log("Skill icon:", selectedSkill.icon);
            console.log("Skill races:", selectedSkill.races);
            console.log("Skill bonuses:", selectedSkill.bonuses);
          }
          onSkillSelect(skillId || null);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Виберіть скіл з бібліотеки" />
        </SelectTrigger>
        <SelectContent>
          {skills.length === 0 ? (
            <SelectItem value="no-skills" disabled>
              Немає доступних скілів в бібліотеці
            </SelectItem>
          ) : (
            <>
              {/* Групи скілів */}
              {hasGroups &&
                Object.entries(groupedSkills.groups).map(([groupId, groupSkills]) => {
                  const firstSkill = groupSkills[0] as SkillFromLibrary & { spellGroup?: { id: string; name: string } | null; spellGroupName?: string };
                  const groupName = firstSkill?.spellGroup?.name || 
                                   firstSkill?.spellGroupName || 
                                   `Група ${groupId}`;
                  return (
                    <div key={groupId}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {groupName}
                      </div>
                      {groupSkills.map((skill) => (
                        <SelectItem key={skill.id} value={skill.id}>
                          {skill.name}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              
              {/* Скіли без групи */}
              {hasUngrouped && (
                <>
                  {hasGroups && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Без групи
                    </div>
                  )}
                  {groupedSkills.ungrouped.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </>
          )}
        </SelectContent>
      </Select>
      {selectedSkillId && (
        <div className="text-xs text-blue-700 dark:text-blue-300">
          Вибрано: {skills.find((s) => s.id === selectedSkillId)?.name}
          <br />
          Клікніть на коло для призначення скіла
        </div>
      )}
    </div>
  );
}
