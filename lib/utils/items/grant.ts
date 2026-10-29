import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { clamp } from "@/lib/utils/common/clamp";
import { composedName, type ItemRowLike, matchesAppliesTo, parameterizedName } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { itemRef } from "@/lib/utils/items/ref";
import { getRow, type RowsById } from "@/lib/utils/items/resolve";

export type GrantPlan = { kind: "stash"; ref: string; name: string } | { kind: "consumable"; artifactId: string; name: string; description?: string; quantity: number; parameter?: string; spellId?: string };

export type GrantError = "ARTIFACT_NOT_FOUND" | "ITEM_PROPERTY_NEEDS_BASE" | "ITEM_BASE_MISMATCH" | "ITEM_PARAMETER_REQUIRED" | "ITEM_PARAMETER_INVALID" | "ITEM_SPELL_REQUIRED" | "ITEM_SPELL_INVALID";

const clampQuantity = (n: number) => clamp(Math.trunc(n), ITEM_LIMITS.grantQuantity[0], ITEM_LIMITS.grantQuantity[1]);

export function planGrant<R extends ItemRowLike>(body: { artifactId: string; baseId?: string; quantity?: number; parameter?: string; spellId?: string }, rowsById: RowsById<R>): { ok: true; plan: GrantPlan } | { ok: false; error: GrantError } {
  const row = getRow(rowsById, body.artifactId);

  if (!row) return { ok: false, error: "ARTIFACT_NOT_FOUND" };

  const stats = itemStatsFromRow(row);

  const baseRow = body.baseId ? getRow(rowsById, body.baseId) : undefined;

  const parameter = stats?.parameter ?? (baseRow && itemStatsFromRow(baseRow)?.parameter);

  if (parameter && !body.parameter) return { ok: false, error: "ITEM_PARAMETER_REQUIRED" };

  if (body.parameter && !parameter?.options.some(({ key }) => key === body.parameter)) return { ok: false, error: "ITEM_PARAMETER_INVALID" };

  if (stats?.consumable && (stats.spells?.length ?? 0) > 0 && !body.spellId) return { ok: false, error: "ITEM_SPELL_REQUIRED" };

  if (body.spellId && !stats?.spells?.some(({ spellId }) => spellId === body.spellId)) return { ok: false, error: "ITEM_SPELL_INVALID" };

  if (stats?.property) {
    if (!body.baseId) return { ok: false, error: "ITEM_PROPERTY_NEEDS_BASE" };

    const base = baseRow;

    if (!base || !matchesAppliesTo(base, row)) return { ok: false, error: "ITEM_BASE_MISMATCH" };

    return { ok: true, plan: { kind: "stash", ref: itemRef(base.id, row.id, body.parameter), name: composedName(base, row, stats.property.nameTemplate).replaceAll("{param}", body.parameter ?? "") } };
  }

  if (body.baseId) return { ok: false, error: "ITEM_BASE_MISMATCH" };

  if (stats?.consumable) {
    const description = row.description?.trim().slice(0, ITEM_LIMITS.specialDescription);

    return { ok: true, plan: { kind: "consumable", artifactId: row.id, name: (body.parameter ? parameterizedName(row.name, body.parameter) : row.name).slice(0, ITEM_LIMITS.specialName), ...(description && { description }), quantity: clampQuantity(body.quantity ?? 1), ...(body.parameter && { parameter: body.parameter }), ...(body.spellId && { spellId: body.spellId }) } };
  }

  return { ok: true, plan: { kind: "stash", ref: itemRef(row.id, null, body.parameter), name: body.parameter ? parameterizedName(row.name, body.parameter) : row.name } };
}
