import { isRecord } from "@/lib/utils/common/is-record";
import { nameKey } from "@/lib/utils/content/import/mapping";
import type { IdName } from "@/types/common";

export const SKILL_TREE_FILE_FORMAT = "skill-tree/1";

type RefKind = "mainSkill" | "skill" | "spellGroup";

export interface SkillTreeFile {
  format: typeof SKILL_TREE_FILE_FORMAT;
  race: string;
  skills: unknown;
  names: Record<string, { name: string; kind: RefKind }>;
}

export type TreeImportPlan = { race: string; treeId: string; skills: Record<string, unknown>; warnings?: string[] };

export type TreeImportFailure = { race: string; error: string };

export const isTreeImportFailure = (p: TreeImportPlan | TreeImportFailure): p is TreeImportFailure => "error" in p;

function collectStrings(value: unknown, out: Set<string>): void {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (isRecord(value)) Object.values(value).forEach((v) => collectStrings(v, out));
}

function replaceStrings(value: unknown, map: ReadonlyMap<string, string>): unknown {
  if (typeof value === "string") return map.get(value) ?? value;

  if (Array.isArray(value)) return value.map((v) => replaceStrings(v, map));

  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceStrings(v, map)]));

  return value;
}

export function exportSkillTrees(trees: ReadonlyArray<{ race: string; skills: unknown }>, refs: { mainSkills: IdName[]; skills: IdName[]; spellGroups?: IdName[] }): SkillTreeFile[] {
  const known = new Map<string, { name: string; kind: RefKind }>();

  for (const g of refs.spellGroups ?? []) known.set(g.id, { name: g.name, kind: "spellGroup" });

  for (const s of refs.skills) known.set(s.id, { name: s.name, kind: "skill" });

  for (const m of refs.mainSkills) known.set(m.id, { name: m.name, kind: "mainSkill" });

  return trees.map((tree) => {
    const used = new Set<string>();

    collectStrings(tree.skills, used);

    const names = Object.fromEntries([...used].flatMap((id) => {
      const ref = known.get(id);

      return ref ? [[id, ref] as const] : [];
    }));

    return { format: SKILL_TREE_FILE_FORMAT, race: tree.race, skills: tree.skills, names };
  });
}

const isTreeFile = (v: unknown): v is SkillTreeFile => isRecord(v) && v.format === SKILL_TREE_FILE_FORMAT && typeof v.race === "string" && isRecord(v.skills) && isRecord(v.names);

export function readSkillTreeFiles(text: string): SkillTreeFile[] {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Некоректний JSON");
  }

  const list = Array.isArray(data) ? data : [data];

  if (list.length === 0 || !list.every(isTreeFile)) throw new Error("Файл не схожий на експорт дерев скілів");

  return list;
}

export function planSkillTreeImport(
  file: SkillTreeFile,
  ctx: { races: IdName[]; trees: ReadonlyArray<{ id: string; race: string }>; mainSkills: IdName[]; skills: IdName[]; spellGroups?: IdName[] },
): TreeImportPlan | TreeImportFailure {
  const race = ctx.races.find((r) => nameKey(r.name) === nameKey(file.race));

  if (!race) return { race: file.race, error: `Раси «${file.race}» немає в кампанії` };

  const spellGroups = ctx.spellGroups ?? [];

  const local = new Set([...ctx.mainSkills, ...ctx.skills].map((r) => r.id));

  const ids = new Map<string, string>();

  const groupIds = new Map<string, string>();

  const missing: string[] = [];

  for (const [id, ref] of Object.entries(file.names)) {
    if (ref.kind === "spellGroup") {
      const group = spellGroups.find((g) => nameKey(g.name) === nameKey(ref.name));

      if (group) groupIds.set(id, group.id);

      continue;
    }

    if (local.has(id)) continue;

    const found = (ref.kind === "mainSkill" ? ctx.mainSkills : ctx.skills).find((r) => nameKey(r.name) === nameKey(ref.name));

    if (found) ids.set(id, found.id);
    else missing.push(ref.name);
  }

  if (missing.length > 0) return { race: race.name, error: `Не знайдено в кампанії: ${missing.join(", ")}` };

  const localGroups = new Set(spellGroups.map((g) => g.id));

  const dropped = new Set<string>();

  const remapGroups = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(remapGroups);

    if (!isRecord(value)) return value;

    const out: Record<string, unknown> = {};

    for (const [key, v] of Object.entries(value)) {
      if (key !== "spellGroupId" || typeof v !== "string") out[key] = remapGroups(v);
      else if (groupIds.has(v)) out[key] = groupIds.get(v);
      else if (localGroups.has(v)) out[key] = v;
      else dropped.add(file.names[v]?.name ?? v);
    }

    return out;
  };

  // the row id and race come from the target campaign (saveSkillTree writes them)
  const skills = Object.fromEntries(Object.entries(remapGroups(replaceStrings(file.skills, ids)) as Record<string, unknown>).filter(([key]) => key !== "id" && key !== "race"));

  const existing = ctx.trees.find((t) => nameKey(t.race) === nameKey(race.name));

  const warnings = dropped.size > 0 ? [`Школу магії не знайдено в кампанії, прибрано: ${[...dropped].join(", ")}`] : undefined;

  return { race: race.name, treeId: existing?.id ?? "new", skills, ...(warnings && { warnings }) };
}
