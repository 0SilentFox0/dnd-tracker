import { Prisma } from "@prisma/client";

import { assertNoLeak, findForeignContentIds } from "./assert-no-leak";
import { type Bundle, BUNDLE_TABLES, BundleInvalidError, BundleSchema, type BundleTableDef, delegateOf, pick, type TemplateDb } from "./bundle";
import { CONTENT_ID_RE, newContentId } from "./ids";
import { collectKeysAndStrings, remapIds } from "./remap-ids";

import { hashJson } from "@/lib/utils/battle/store/stable-json";

const idCandidates = (bundle: Bundle) => new Set([...collectKeysAndStrings(bundle)].filter((s) => CONTENT_ID_RE.test(s)));

function toPrismaJson(row: Record<string, unknown>, t: BundleTableDef) {
  const out = { ...row };

  for (const col of t.nullableJson) if (out[col] === null) out[col] = Prisma.DbNull;

  return out;
}

export async function importBundle(tx: TemplateDb, raw: Bundle, targetCampaignId: string) {
  const parsed = BundleSchema.safeParse(raw);

  if (!parsed.success) throw new BundleInvalidError("Бандл має неправильний формат", parsed.error.issues);

  const bundle = parsed.data;

  const warnings: string[] = [];

  const idMap = new Map<string, string>();

  for (const t of BUNDLE_TABLES) {
    const seen = new Set<string>();

    for (const row of bundle[t.key]) {
      if (seen.has(row.id)) throw new BundleInvalidError(`Дубльований id у ${t.key}: ${row.id}`);

      seen.add(row.id);
      idMap.set(row.id, newContentId());
    }
  }

  const foreign = await findForeignContentIds(tx, idCandidates(bundle), new Set(idMap.keys()));

  if (foreign.length > 0) throw new BundleInvalidError(`Бандл посилається на контент інших кампаній: ${foreign.slice(0, 5).join(", ")}`);

  const idsByTable = new Map(BUNDLE_TABLES.map((t) => [t.key, new Set(bundle[t.key].map((r) => r.id))]));

  const remappedRows: Record<string, unknown>[] = [];

  const writes = BUNDLE_TABLES.map((t) => {
    const rows = bundle[t.key].map((row) => {
      const clean = pick(row, t.columns);

      for (const [col, target] of Object.entries(t.fks)) {
        const ref = clean[col];

        if (typeof ref === "string" && !idsByTable.get(target!)!.has(ref)) {
          warnings.push(`${t.key} ${row.id}: ${col} → null`);
          clean[col] = null;
        }
      }

      const remapped = remapIds(clean, idMap);

      remappedRows.push(remapped);

      return toPrismaJson(
        { ...remapped, id: idMap.get(row.id)!, campaignId: targetCampaignId, sourceId: row.id, sourceHash: hashJson(clean) },
        t,
      );
    });

    return { t, rows };
  });

  assertNoLeak(remappedRows, new Set(idMap.keys()));

  for (const { t, rows } of writes) if (rows.length > 0) await delegateOf(tx, t).createMany({ data: rows });

  return { idMap, warnings };
}
