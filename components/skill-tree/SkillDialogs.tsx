import type {
  SkillTree,
  Skill,
  CentralSkill,
  UltimateSkill,
} from "@/lib/types/skill-tree";
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
  selectedCentralSkill: CentralSkill | null;
  selectedUltimateSkill: UltimateSkill | null;
  skillTree: SkillTree;
  unlockedSkills: string[];
  unlockedCentralSkills: string[];
  isMainSkillFullyUnlocked: (mainSkillId: string) => boolean;
  onCloseSkill: () => void;
  onCloseCentralSkill: () => void;
  onCloseUltimateSkill: () => void;
}

export function SkillDialogs({
  selectedSkill,
  selectedCentralSkill,
  selectedUltimateSkill,
  skillTree,
  unlockedSkills,
  unlockedCentralSkills,
  isMainSkillFullyUnlocked,
  onCloseSkill,
  onCloseCentralSkill,
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
              Рівень: {LEVEL_NAMES[selectedSkill?.level || "basic"]} • Коло{" "}
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

      {/* Діалог з описом центрального навику */}
      <Dialog
        open={!!selectedCentralSkill}
        onOpenChange={(open) => !open && onCloseCentralSkill()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCentralSkill?.name}</DialogTitle>
            <DialogDescription>Центральний навик</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">{selectedCentralSkill?.description}</p>
            {selectedCentralSkill && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Вимога: Повністю прокачати навик &quot;
                  {
                    skillTree.mainSkills.find(
                      (ms) => ms.id === selectedCentralSkill.requiredMainSkillId
                    )?.name
                  }
                  &quot;
                </p>
                <p
                  className={`text-xs ${
                    isMainSkillFullyUnlocked(
                      selectedCentralSkill.requiredMainSkillId
                    )
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {isMainSkillFullyUnlocked(
                    selectedCentralSkill.requiredMainSkillId
                  )
                    ? "✓ Вимога виконана"
                    : "✗ Вимога не виконана"}
                </p>
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
            {selectedUltimateSkill && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Вимога: Вивчити 3 з 4 центральних навиків
                </p>
                <ul className="text-xs space-y-1">
                  {skillTree.centralSkills.map((cs) => (
                    <li
                      key={cs.id}
                      className={
                        unlockedCentralSkills.includes(cs.id)
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {cs.name}{" "}
                      {unlockedCentralSkills.includes(cs.id) ? "✓" : "✗"}
                    </li>
                  ))}
                </ul>
                <p className="text-xs mt-2 text-gray-600">
                  Вивчено:{" "}
                  {
                    skillTree.ultimateSkill.requiredCentralSkillIds.filter(
                      (id) => unlockedCentralSkills.includes(id)
                    ).length
                  }
                  /3
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
