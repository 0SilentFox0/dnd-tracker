import { LEVEL_NAMES } from "@/components/skill-tree/utils/constants";
import { getAllSkillsFromMainSkill } from "@/components/skill-tree/utils/hooks";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type {
  Skill,
  SkillTree,
  UltimateSkill,
} from "@/types/skill-tree";
import { SkillLevel } from "@/types/skill-tree";

interface SkillDialogsProps {
  selectedSkill: Skill | null;
  selectedUltimateSkill: UltimateSkill | null;
  skillTree: SkillTree;
  unlockedSkills: string[];
  onCloseSkill: () => void;
  onCloseUltimateSkill: () => void;
}

export function SkillDialogs({
  selectedSkill,
  selectedUltimateSkill,
  skillTree,
  unlockedSkills,
  onCloseSkill,
  onCloseUltimateSkill,
}: SkillDialogsProps) {
  return (
    <>
      <ResponsiveDialog open={!!selectedSkill} onOpenChange={(open) => !open && onCloseSkill()} title={<>{selectedSkill?.name}</>} description={<>Рівень:{" "}
              {LEVEL_NAMES[selectedSkill?.level || SkillLevel.BASIC]} • Коло{" "}
              {selectedSkill?.circle}</>}>
          <div className="space-y-2">
            <p className="text-sm">{selectedSkill?.description}</p>
            {selectedSkill?.prerequisites &&
              selectedSkill.prerequisites.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    Вимоги:
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {selectedSkill.prerequisites.map((prereq) => {
                      const prereqSkill = skillTree.mainSkills
                        .flatMap((ms) => getAllSkillsFromMainSkill(ms))
                        .find((s) => s.id === prereq);

                      return (
                        <li
                          key={prereq}
                          className={
                            unlockedSkills.includes(prereq)
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {prereqSkill?.name || prereq}{" "}
                          {unlockedSkills.includes(prereq) ? "✓" : "✗"}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
          </div>
        
      </ResponsiveDialog>

      <ResponsiveDialog open={!!selectedUltimateSkill} onOpenChange={(open) => !open && onCloseUltimateSkill()} title={<>{selectedUltimateSkill?.name}</>} description="Ультимативний навик">
          <div className="space-y-2">
            <p className="text-sm">{selectedUltimateSkill?.description}</p>
          </div>
        
      </ResponsiveDialog>
    </>
  );
}
