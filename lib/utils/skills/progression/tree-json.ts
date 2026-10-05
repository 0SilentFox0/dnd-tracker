import type { BranchLevel, Circle } from "./types";
import { RACIAL_BRANCH_ID } from "./types";

export interface RawSlot { id: string; name?: string; description?: string; icon?: string }

type RawCircles = { circle1?: RawSlot[]; circle2?: RawSlot[]; circle3?: RawSlot[] };

export interface RawBranch {
  id: string;
  name: string;
  color: string;
  icon?: string;
  spellGroupId?: string;
  levelSkillIds?: Partial<Record<BranchLevel, string>>;
  levelIcons?: Partial<Record<BranchLevel, string>>;
  levels?: Partial<Record<BranchLevel, RawCircles>>;
  [key: string]: unknown;
}

export interface RawTree { id?: string; race?: string; mainSkills: RawBranch[]; ultimateSkill?: RawSlot | null; [key: string]: unknown }

export const CIRCLE_KEY: Record<Circle, keyof RawCircles> = { outer: "circle3", middle: "circle2", inner: "circle1" };

export function readTreeJson(skills: unknown): RawTree {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) return { mainSkills: [] };

  const obj = skills as Record<string, unknown>;

  const mainSkills = Array.isArray(obj.mainSkills)
    ? (obj.mainSkills as unknown[]).filter((b): b is RawBranch => !!b && typeof b === "object" && typeof (b as RawBranch).id === "string")
    : [];

  return { ...obj, mainSkills } as RawTree;
}

export interface BuildTreeInput {
  id?: string;
  race: string;
  branches: Array<{
    id: string;
    name: string;
    color: string;
    icon?: string;
    spellGroupId?: string;
    levels?: Partial<Record<BranchLevel, string>>;
    outer?: string[];
    middle?: string[];
    inner?: string[];
  }>;
  racial?: Partial<Record<BranchLevel, string>>;
  ultimate?: string;
}

const slots = (ids: string[] = []): RawSlot[] => ids.map((id) => ({ id }));

const emptyCircles = (): RawCircles => ({ circle1: [], circle2: [], circle3: [] });

export function buildTreeJson(input: BuildTreeInput): RawTree {
  const branches: RawBranch[] = input.branches.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    ...(b.icon && { icon: b.icon }),
    ...(b.spellGroupId && { spellGroupId: b.spellGroupId }),
    levelSkillIds: { ...b.levels },
    levels: {
      basic: { circle3: slots(b.outer), circle2: slots(b.middle), circle1: slots(b.inner) },
      advanced: emptyCircles(),
      expert: emptyCircles(),
    },
  }));

  branches.push({ id: RACIAL_BRANCH_ID, name: "Раса", color: "gainsboro", levelSkillIds: { ...input.racial }, levels: {} });

  return {
    ...(input.id && { id: input.id }),
    race: input.race,
    mainSkills: branches,
    ultimateSkill: input.ultimate ? { id: input.ultimate } : null,
  };
}

/** JSON для клієнта без назв/описів у слотах — вони приходять окремою мапою скілів. */
export function stripTreeForClient(raw: RawTree): RawTree {
  const strip = (list?: RawSlot[]) => list?.map((s) => ({ id: s.id }));

  return {
    ...raw,
    mainSkills: raw.mainSkills.map((b) => ({
      ...b,
      levels: b.levels && {
        basic: b.levels.basic && { circle1: strip(b.levels.basic.circle1), circle2: strip(b.levels.basic.circle2), circle3: strip(b.levels.basic.circle3) },
      },
    })),
    ultimateSkill: raw.ultimateSkill ? { id: raw.ultimateSkill.id } : null,
  };
}
