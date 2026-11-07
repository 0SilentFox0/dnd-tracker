import type { HitLocation } from "../combat/constants";
import { CRIT_TABLE } from "../combat/crit-table";
import { isWfrpConditionKey } from "../conditions/catalog";
import { MISCAST_TABLE, type MiscastEffect,WRATH_TABLE } from "../magic/miscast-table";

import type { TableEffect, TableRow, TableSlot } from "@/lib/utils/rules/tables-schema";

export interface ResolvedRow extends TableRow {
  textKey?: string;
}

const critRows = (loc: HitLocation): ResolvedRow[] =>
  CRIT_TABLE[loc].map((row, i) => {
    const effects: TableEffect[] = [];

    if (row.bonusDamage > 0) effects.push({ type: "damage", amount: row.bonusDamage });

    if (row.markerKey) effects.push(isWfrpConditionKey(row.markerKey) ? { type: "condition", key: row.markerKey, levels: 1 } : { type: "marker", key: row.markerKey as "winded" | "disarmed" | "crippled" });

    return { max: row.max, effects, textKey: `battleWfrp.crit.${loc}.${i + 1}` };
  });

const magicRows = (rows: readonly MiscastEffect[], kind: "minor" | "major" | "wrath"): ResolvedRow[] =>
  rows.map((row, i) => {
    const effects: TableEffect[] = [];

    if (row.condition) effects.push({ type: "condition", key: row.condition.key, levels: row.condition.levels });

    if (row.wounds) effects.push({ type: "wounds", amount: row.wounds });

    return { max: row.max, effects, textKey: `wfrpMagic.miscast.${kind}.${i + 1}` };
  });

export const DEFAULT_TABLES: Record<TableSlot, readonly ResolvedRow[]> = {
  critHead: critRows("head"),
  critArm: critRows("arm"),
  critBody: critRows("body"),
  critLeg: critRows("leg"),
  miscastMinor: magicRows(MISCAST_TABLE.minor, "minor"),
  miscastMajor: magicRows(MISCAST_TABLE.major, "major"),
  wrath: magicRows(WRATH_TABLE, "wrath"),
};

