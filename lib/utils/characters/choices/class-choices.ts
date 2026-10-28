import { DND_SKILLS, type DndSkill, isDndSkill } from "@/lib/constants/skills";
import type { Choice } from "@/types/choices";
import type { GameClassData, Subclass } from "@/types/classes";

export const MULTICLASS_SKILLS_ID = "multiclass-skills";

/** SRD multiclass skill grant as a level-1 skill choice (only when the class is taken after the first). */
const multiclassSkillDefs = (cls: GameClassData): Choice[] => {
  const grant = cls.multiclassProficiencies?.skills;

  if (!grant || grant.count <= 0) return [];

  const skills: DndSkill[] = grant.from.filter(isDndSkill);

  return [{ id: MULTICLASS_SKILLS_ID, label: "Навички мультикласу", level: 1, count: grant.count, kind: "skill", skills: skills.length > 0 ? skills : [...DND_SKILLS] }];
};

export const classChoiceDefs = (cls: GameClassData, subclass: Subclass | null, multiclass = false): Choice[] => [
  ...(multiclass ? multiclassSkillDefs(cls) : []),
  ...[...cls.features, ...(subclass?.features ?? [])].flatMap((f) => f.choices ?? []),
];

export const levelUpChoiceDefs = (cls: GameClassData, subclass: Subclass | null, nextLevel: number, multiclass = false): Choice[] =>
  classChoiceDefs(cls, subclass, multiclass).filter((c) => c.level === nextLevel || (c.level < nextLevel && typeof c.count !== "number"));
