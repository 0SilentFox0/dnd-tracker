import { realSkillId } from "./ids";
import type { RawBranch, RawSlot, RawTree } from "./tree-json";
import { CIRCLE_KEY } from "./tree-json";
import type { BranchLevel, Circle } from "./types";
import { BRANCH_LEVELS, CIRCLE_SIZE, CIRCLES, RACIAL_BRANCH_ID } from "./types";

export type CellRef =
  | { kind: "level"; branchId: string; level: BranchLevel }
  | { kind: "racial"; level: BranchLevel }
  | { kind: "slot"; branchId: string; circle: Circle; index: number }
  | { kind: "ultimate" };

type SkillPick = { id: string; name: string; icon?: string | null } | null;

const findBranch = (raw: RawTree, id: string) => raw.mainSkills.find((b) => b.id === id);

export function cellSkillId(raw: RawTree, ref: CellRef): string | null {
  if (ref.kind === "ultimate") return realSkillId(raw.ultimateSkill?.id);

  if (ref.kind === "racial") return realSkillId(findBranch(raw, RACIAL_BRANCH_ID)?.levelSkillIds?.[ref.level]);

  const branch = findBranch(raw, ref.branchId);

  if (ref.kind === "level") return realSkillId(branch?.levelSkillIds?.[ref.level]);

  return realSkillId(branch?.levels?.basic?.[CIRCLE_KEY[ref.circle]]?.[ref.index]?.id);
}

function withLevelSkill(branch: RawBranch, level: BranchLevel, skill: SkillPick): RawBranch {
  const levelSkillIds = { ...branch.levelSkillIds };

  const levelIcons = { ...branch.levelIcons };

  if (skill) {
    levelSkillIds[level] = skill.id;

    if (skill.icon) levelIcons[level] = skill.icon;
  } else {
    delete levelSkillIds[level];
    delete levelIcons[level];
  }

  return { ...branch, levelSkillIds, levelIcons };
}

function withSlot(branch: RawBranch, circle: Circle, index: number, skill: SkillPick): RawBranch {
  const key = CIRCLE_KEY[circle];

  const basic = { circle1: [], circle2: [], circle3: [], ...branch.levels?.basic };

  const list: RawSlot[] = Array.from({ length: CIRCLE_SIZE[circle] }, (_, i) => basic[key]?.[i] ?? { id: "" });

  list[index] = skill ? { id: skill.id, name: skill.name, ...(skill.icon && { icon: skill.icon }) } : { id: "" };

  return { ...branch, levels: { ...branch.levels, basic: { ...basic, [key]: list } } };
}

const ensureRacial = (raw: RawTree): RawTree =>
  findBranch(raw, RACIAL_BRANCH_ID) ? raw : { ...raw, mainSkills: [...raw.mainSkills, { id: RACIAL_BRANCH_ID, name: "Раса", color: "gainsboro", levelSkillIds: {}, levels: {} }] };

export function setCellSkill(raw: RawTree, ref: CellRef, skill: SkillPick): RawTree {
  if (ref.kind === "ultimate") return { ...raw, ultimateSkill: skill ? { id: skill.id, name: skill.name, ...(skill.icon && { icon: skill.icon }) } : null };

  const tree = ref.kind === "racial" ? ensureRacial(raw) : raw;

  const branchId = ref.kind === "racial" ? RACIAL_BRANCH_ID : ref.branchId;

  return {
    ...tree,
    mainSkills: tree.mainSkills.map((b) => {
      if (b.id !== branchId) return b;

      return ref.kind === "slot" ? withSlot(b, ref.circle, ref.index, skill) : withLevelSkill(b, ref.level, skill);
    }),
  };
}

const racialLast = (branches: RawBranch[]) => [...branches.filter((b) => b.id !== RACIAL_BRANCH_ID), ...branches.filter((b) => b.id === RACIAL_BRANCH_ID)];

export function addBranch(raw: RawTree, branch: { id: string; name: string; color: string; icon?: string | null; spellGroupId?: string | null }): RawTree {
  if (findBranch(raw, branch.id)) return raw;

  const empty = () => ({ circle1: [], circle2: [], circle3: [] });

  const next: RawBranch = {
    id: branch.id,
    name: branch.name,
    color: branch.color,
    ...(branch.icon && { icon: branch.icon }),
    ...(branch.spellGroupId && { spellGroupId: branch.spellGroupId }),
    levelSkillIds: {},
    levels: { basic: empty(), advanced: empty(), expert: empty() },
  };

  return { ...raw, mainSkills: racialLast([...raw.mainSkills, next]) };
}

export function removeBranch(raw: RawTree, branchId: string): RawTree {
  return { ...raw, mainSkills: raw.mainSkills.filter((b) => b.id !== branchId) };
}

export function moveBranch(raw: RawTree, branchId: string, dir: -1 | 1): RawTree {
  const list = racialLast(raw.mainSkills);

  const from = list.findIndex((b) => b.id === branchId);

  const to = from + dir;

  if (from < 0 || to < 0 || to >= list.length || list[to].id === RACIAL_BRANCH_ID) return raw;

  [list[from], list[to]] = [list[to], list[from]];

  return { ...raw, mainSkills: list };
}

export function emptyTree(race: string, branches: Parameters<typeof addBranch>[1][]): RawTree {
  return ensureRacial(branches.reduce<RawTree>((raw, b) => addBranch(raw, b), { race, mainSkills: [], ultimateSkill: null }));
}

export function skillLocations(raw: RawTree): Map<string, CellRef[]> {
  const out = new Map<string, CellRef[]>();

  const put = (id: string | null, ref: CellRef) => {
    if (id) out.set(id, [...(out.get(id) ?? []), ref]);
  };

  for (const b of raw.mainSkills) {
    for (const level of BRANCH_LEVELS) {
      put(realSkillId(b.levelSkillIds?.[level]), b.id === RACIAL_BRANCH_ID ? { kind: "racial", level } : { kind: "level", branchId: b.id, level });
    }

    if (b.id === RACIAL_BRANCH_ID) continue;

    for (const circle of CIRCLES) {
      (b.levels?.basic?.[CIRCLE_KEY[circle]] ?? []).forEach((s, index) => put(realSkillId(s?.id), { kind: "slot", branchId: b.id, circle, index }));
    }
  }

  put(realSkillId(raw.ultimateSkill?.id), { kind: "ultimate" });

  return out;
}
