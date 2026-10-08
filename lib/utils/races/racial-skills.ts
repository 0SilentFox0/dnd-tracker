import { realSkillId } from "@/lib/utils/skills/progression/ids";
import { readTreeJson } from "@/lib/utils/skills/progression/tree-json";
import { BRANCH_LEVELS, type BranchLevel, RACIAL_BRANCH_ID } from "@/lib/utils/skills/progression/types";

export interface RacialSkillView {
  id: string;
  name: string;
  description: string;
  appearanceDescription: string;
  level: BranchLevel | "ultimate";
}

export interface RaceRacialSkills {
  levels: RacialSkillView[];
  ultimate: RacialSkillView | null;
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

function toView(skill: unknown, level: RacialSkillView["level"]): RacialSkillView | null {
  if (!skill || typeof skill !== "object") return null;

  const s = skill as Record<string, unknown>;

  const info = (s.basicInfo && typeof s.basicInfo === "object" ? s.basicInfo : s) as Record<string, unknown>;

  return { id: text(s.id), name: text(info.name), description: text(info.description), appearanceDescription: text(s.appearanceDescription), level };
}

export function raceRacialSkills(rawTree: unknown, skills: readonly unknown[]): RaceRacialSkills {
  const tree = readTreeJson(rawTree);

  const byId = new Map(skills.flatMap((s) => (s && typeof s === "object" ? [[text((s as { id?: unknown }).id), s] as const] : [])));

  const find = (id: unknown, level: RacialSkillView["level"]) => {
    const real = realSkillId(id);

    return real ? toView(byId.get(real), level) : null;
  };

  const racial = tree.mainSkills.find((b) => b.id === RACIAL_BRANCH_ID);

  return {
    levels: BRANCH_LEVELS.flatMap((level) => find(racial?.levelSkillIds?.[level], level) ?? []),
    ultimate: find(tree.ultimateSkill?.id, "ultimate"),
  };
}
