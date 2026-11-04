import { layeredModels } from "@/lib/db/layer/config";
import { BUNDLE_TABLES, type BundleTable, type BundleTableDef, pick } from "@/lib/server/templates/bundle";
import { CONTENT_ID_RE } from "@/lib/server/templates/ids";
import { remapDeep } from "@/lib/server/templates/legacy-migration/remap";
import type { MigrationPlan, OverrideReason, PlanInput, Row, RowDecision } from "@/lib/server/templates/legacy-migration/types";
import { rowHash } from "@/lib/server/templates/sync/hash";
import { pendingKey } from "@/lib/server/templates/sync/layered";
import { cloneState } from "@/lib/server/templates/sync/state";

export const LEGACY_UNKNOWN_HASH = "legacy:unknown";

const localHash = (row: Row, t: BundleTableDef, map: ReadonlyMap<string, string>) => rowHash(remapDeep(pick(row, t.columns), map), t);

const time = (row: Row) => new Date(row.createdAt as string | Date).getTime() || 0;

const byAge = (a: Row, b: Row) => time(a) - time(b) || a.id.localeCompare(b.id);

const isSourced = (row: Row): row is Row & { sourceId: string } => typeof row.sourceId === "string" && row.sourceId !== "";

const remapped = (row: Row, t: BundleTableDef, map: ReadonlyMap<string, string>): Row => ({ ...row, ...remapDeep(pick(row, t.columns), map), id: row.id });

function reasonOf({ s, b, l }: { s: string; b: string | undefined; l: string }): OverrideReason {
  if (b === undefined) return "noBaseline";

  if (s === b) return "dmEdited";

  return l === b ? "templateChanged" : "both";
}

export function planLegacyMigration(input: PlanInput): MigrationPlan {
  const { stored, base, baseline } = input;

  const warnings: MigrationPlan["warnings"] = [];

  const blockers: MigrationPlan["blockers"] = [];

  const decisions: RowDecision[] = [];

  const hides: MigrationPlan["hides"] = [];

  const ignored = cloneState(input.ignored);

  const rows = Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, [] as Row[]])) as Record<BundleTable, Row[]>;

  const provisional = new Map<string, string>();

  for (const t of BUNDLE_TABLES) for (const r of stored[t.key]) if (isSourced(r) && CONTENT_ID_RE.test(r.sourceId)) provisional.set(r.id, r.sourceId);

  const winners = new Map<BundleTable, Map<string, Row>>();

  const demoted = new Map<string, "duplicate" | "badSourceId">();

  const idMap = new Map<string, string>();

  for (const t of BUNDLE_TABLES) {
    const groups = new Map<string, Row[]>();

    for (const r of stored[t.key]) {
      if (!isSourced(r)) continue;

      if (!CONTENT_ID_RE.test(r.sourceId)) {
        demoted.set(r.id, "badSourceId");
        warnings.push({ code: "BAD_SOURCE_ID", table: t.key, id: r.id });

        continue;
      }

      groups.set(r.sourceId, [...(groups.get(r.sourceId) ?? []), r]);
    }

    const won = new Map<string, Row>();

    for (const [k, group] of groups) {
      const sorted = [...group].sort(byAge);

      const baseRow = base[t.key].get(k);

      const baseHash = baseRow && rowHash(baseRow, t);

      const winner = (baseHash !== undefined && sorted.find((r) => localHash(r, t, provisional) === baseHash)) || sorted[0];

      won.set(k, winner);
      idMap.set(winner.id, k);

      for (const loser of sorted) {
        if (loser === winner) continue;

        demoted.set(loser.id, "duplicate");
        warnings.push({ code: "DUPLICATE_SOURCE_ID", table: t.key, id: loser.id });
      }
    }

    winners.set(t.key, won);
  }

  for (const t of BUNDLE_TABLES) {
    const won = winners.get(t.key)!;

    const winnerIds = new Set([...won.values()].map((r) => r.id));

    const baseIds = base[t.key];

    const keep = (row: Row) => {
      rows[t.key].push(row);

      if (baseIds.has(row.id)) blockers.push({ code: "ID_COLLISION", table: t.key, id: row.id });
    };

    for (const r of stored[t.key]) {
      if (!winnerIds.has(r.id)) {
        const reason = demoted.get(r.id);

        keep({ ...remapped(r, t, idMap), sourceId: null, sourceHash: null });
        decisions.push({ kind: "local", table: t.key, localId: r.id, ...(reason && { demoted: reason }) });

        continue;
      }

      const k = idMap.get(r.id)!;

      const b = baseline[t.key]?.[k];

      const baseRow = baseIds.get(k);

      if (!baseRow) {
        keep({ ...remapped(r, t, idMap), sourceId: k, sourceHash: b ?? LEGACY_UNKNOWN_HASH });
        decisions.push({ kind: "override", table: t.key, localId: r.id, key: k, sourceHash: b ?? LEGACY_UNKNOWN_HASH, reason: "orphan" });

        continue;
      }

      const s = rowHash(baseRow, t);

      const l = localHash(r, t, idMap);

      if (l === s) {
        decisions.push({ kind: "baseRef", table: t.key, localId: r.id, key: k });

        continue;
      }

      const sourceHash = b ?? LEGACY_UNKNOWN_HASH;

      keep({ ...remapped(r, t, idMap), sourceId: k, sourceHash });
      decisions.push({ kind: "override", table: t.key, localId: r.id, key: k, sourceHash, reason: reasonOf({ s, b, l }) });
    }

    for (const [k, baseRow] of baseIds) {
      if (won.has(k)) continue;

      const pending = baseline[t.key]?.[k] === undefined;

      if (pending) (ignored.tables[t.key] ??= {})[pendingKey(k)] = rowHash(baseRow, t);

      hides.push({ table: layeredModels()[t.model].hideTable, id: k });
      decisions.push({ kind: "hide", table: t.key, key: k, pending });
    }
  }

  return { idMap, decisions, rows, hides, ignored, blockers, warnings };
}
