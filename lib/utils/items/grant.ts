import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { composedName, type ItemRowLike, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { itemRef } from "@/lib/utils/items/ref";
import { getRow, type RowsById } from "@/lib/utils/items/resolve";

export type GrantPlan = { kind: "stash"; ref: string; name: string } | { kind: "consumable"; artifactId: string; name: string; description?: string; quantity: number };

export type GrantError = "ARTIFACT_NOT_FOUND" | "ITEM_PROPERTY_NEEDS_BASE" | "ITEM_BASE_MISMATCH";

const clamp = (n: number) => Math.min(ITEM_LIMITS.grantQuantity[1], Math.max(ITEM_LIMITS.grantQuantity[0], Math.trunc(n)));

export function planGrant<R extends ItemRowLike>(body: { artifactId: string; baseId?: string; quantity?: number }, rowsById: RowsById<R>): { ok: true; plan: GrantPlan } | { ok: false; error: GrantError } {
  const row = getRow(rowsById, body.artifactId);

  if (!row) return { ok: false, error: "ARTIFACT_NOT_FOUND" };

  const stats = itemStatsFromRow(row);

  if (stats?.property) {
    if (!body.baseId) return { ok: false, error: "ITEM_PROPERTY_NEEDS_BASE" };

    const base = getRow(rowsById, body.baseId);

    if (!base || !matchesAppliesTo(base, row)) return { ok: false, error: "ITEM_BASE_MISMATCH" };

    return { ok: true, plan: { kind: "stash", ref: itemRef(base.id, row.id), name: composedName(base, row, stats.property.nameTemplate) } };
  }

  if (body.baseId) return { ok: false, error: "ITEM_BASE_MISMATCH" };

  if (stats?.consumable) {
    const description = row.description?.trim().slice(0, ITEM_LIMITS.specialDescription);

    return { ok: true, plan: { kind: "consumable", artifactId: row.id, name: row.name.slice(0, ITEM_LIMITS.specialName), ...(description && { description }), quantity: clamp(body.quantity ?? 1) } };
  }

  return { ok: true, plan: { kind: "stash", ref: row.id, name: row.name } };
}
