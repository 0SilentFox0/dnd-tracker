import type { ErrorParams } from "@/lib/constants/api-errors";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import { columnValueAt } from "@/lib/utils/characters/classes/columns";
import { classPoolKey } from "@/lib/utils/items/pools";
import type { AbilityPool } from "@/types/battle";
import type { ClassColumn, ResolvedClassEntry } from "@/types/classes";

type Path = (string | number)[];

export interface ColumnRef {
  path: Path;
  key: string;
  kind: "scale" | "pool";
}

export const FLAT_KEYS = ["flat", "percent"] as const;

export const AMOUNT_KEYS = ["amount", "damagePerRound", "healPerRound"] as const;

export const CLASS_REF_OUTSIDE = "abilities.validation.classRefOutside";

export const isScaleRef = (v: unknown): v is { scale: string } => !!v && typeof v === "object" && typeof (v as { scale?: unknown }).scale === "string";

function effectRefs(e: Effect, path: Path): ColumnRef[] {
  if (e.kind === "randomOf") return e.options.flatMap((o, i) => effectRefs(o, [...path, "options", i]));

  const record = e as Record<string, unknown>;

  return [...FLAT_KEYS, ...AMOUNT_KEYS].flatMap((k) => {
    const v = record[k];

    return isScaleRef(v) ? [{ path: [...path, k], key: v.scale, kind: "scale" as const }] : [];
  });
}

export function abilityColumnRefs(a: Ability): ColumnRef[] {
  const refs = a.effects.flatMap((e, i) => effectRefs(e, ["effects", i]));

  const uses = a.limits?.perRest?.uses;

  if (isScaleRef(uses)) refs.push({ path: ["limits", "perRest", "uses"], key: uses.scale, kind: "scale" });

  if (a.limits?.pool) refs.push({ path: ["limits", "pool", "key"], key: a.limits.pool.key, kind: "pool" });

  return refs;
}

export function columnRefIssues(abilities: readonly Ability[], columns: readonly ClassColumn[] | null): { path: Path; message: string; params?: ErrorParams }[] {
  return abilities.flatMap((a, i) =>
    abilityColumnRefs(a).flatMap((ref) => {
      const path = [i, ...ref.path];

      if (!columns) return [{ path, message: CLASS_REF_OUTSIDE }];

      const column = columns.find((c) => c.key === ref.key);

      if (!column) return [{ path, message: "abilities.validation.columnMissing", params: { key: ref.key } }];

      return ref.kind === "pool" && !column.pool ? [{ path, message: "abilities.validation.columnNotPool", params: { label: column.label } }] : [];
    }),
  );
}

export interface ScaleContext {
  classId: string;
  level: number;
  columns: readonly ClassColumn[];
}

const CLASS_LEVEL_RE = /\bclass_level\b/g;

const HAS_CLASS_LEVEL = /\bclass_level\b/;

const cellAt = (ref: { scale: string }, ctx: ScaleContext) => {
  const column = ctx.columns.find((c) => c.key === ref.scale);

  return column ? columnValueAt(column, ctx.level) : null;
};

const numberAt = (ref: { scale: string }, ctx: ScaleContext): number => {
  const v = cellAt(ref, ctx);

  return typeof v === "number" ? v : 0;
};

const amountAt = (ref: { scale: string }, ctx: ScaleContext): number | string => cellAt(ref, ctx) ?? 0;

function withClassLevel<T>(value: T, level: number): T {
  if (Array.isArray(value)) return value.map((v) => withClassLevel(v, level)) as T;

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, k === "formula" && typeof v === "string" ? v.replace(CLASS_LEVEL_RE, String(level)) : withClassLevel(v, level)]),
  ) as T;
}

function scaleEffect(e: Effect, ctx: ScaleContext): Effect {
  if (e.kind === "randomOf") return { ...e, options: e.options.map((o) => scaleEffect(o, ctx) as typeof o) };

  const out: Record<string, unknown> = { ...e };

  for (const k of FLAT_KEYS) if (isScaleRef(out[k])) out[k] = numberAt(out[k] as { scale: string }, ctx);

  for (const k of AMOUNT_KEYS) if (isScaleRef(out[k])) out[k] = amountAt(out[k] as { scale: string }, ctx);

  return out as Effect;
}

const needsClassScale = (a: Ability) => abilityColumnRefs(a).length > 0 || HAS_CLASS_LEVEL.test(JSON.stringify(a));

export function applyClassScale(abilities: Ability[], ctx: ScaleContext): Ability[] {
  return abilities.map((a) => {
    if (!needsClassScale(a)) return a;

    const l = a.limits;

    const uses = l?.perRest?.uses;

    const limits = l && {
      ...l,
      ...(l.perRest && { perRest: { ...l.perRest, uses: isScaleRef(uses) ? numberAt(uses, ctx) : l.perRest.uses } }),
      ...(l.pool && { pool: { ...l.pool, key: classPoolKey(ctx.classId, l.pool.key) } }),
    };

    return withClassLevel({ ...a, effects: a.effects.map((e) => scaleEffect(e, ctx)), ...(limits && { limits }) }, ctx.level);
  });
}

export function classPools(entries: readonly ResolvedClassEntry[]): Record<string, AbilityPool> {
  const out: Record<string, AbilityPool> = {};

  for (const { class: cls, level } of entries) {
    if (!cls) continue;

    for (const column of cls.columns ?? []) {
      if (!column.pool) continue;

      const max = columnValueAt(column, level);

      if (typeof max === "number" && max > 0) out[classPoolKey(cls.id, column.key)] = { label: column.label, max, rest: column.pool.rest };
    }
  }

  return out;
}
