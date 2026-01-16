import type {
  SkillTree,
  Skill,
  UltimateSkill,
} from "@/lib/types/skill-tree";
import { SkillLevel } from "@/lib/types/skill-tree";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAllSkillsFromMainSkill } from "./hooks";
import { LEVEL_NAMES } from "./constants";

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
      {/* Діалог з описом навики */}
      <Dialog open={!!selectedSkill} onOpenChange={(open) => !open && onCloseSkill()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSkill?.name}</DialogTitle>
            <DialogDescription>
              Рівень:{" "}
              {LEVEL_NAMES[selectedSkill?.level || SkillLevel.BASIC]} • Коло{" "}
              {selectedSkill?.circle}
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      {/* Діалог з описом ультимативного навику */}
      <Dialog
        open={!!selectedUltimateSkill}
        onOpenChange={(open) => !open && onCloseUltimateSkill()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUltimateSkill?.name}</DialogTitle>
            <DialogDescription>Ультимативний навик</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">{selectedUltimateSkill?.description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
