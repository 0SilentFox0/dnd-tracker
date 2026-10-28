import type { TableHashes } from "./sync/types";
import { assertNoLeak, findForeignContentIds } from "./assert-no-leak";
import { type Bundle, BUNDLE_TABLES, BundleInvalidError, BundleSchema, delegateOf, pick, type TemplateDb,toPrismaJson } from "./bundle";
import { CONTENT_ID_RE, newContentId } from "./ids";
import { collectKeysAndStrings, remapIds } from "./remap-ids";

import { API_ERRORS, bundleDuplicateIdMessage } from "@/lib/constants/api-errors";
import { type CompendiumBundleDb,importCompendiumSection } from "@/lib/server/compendium-import/bundle";
import { rowHash } from "@/lib/server/templates/sync/hash";
import { backgroundReferenceError } from "@/lib/utils/backgrounds/integrity";

const idCandidates = (bundle: Bundle) => new Set([...collectKeysAndStrings(bundle)].filter((s) => CONTENT_ID_RE.test(s)));

export async function importBundle(tx: TemplateDb, raw: Bundle, targetCampaignId: string) {
  const parsed = BundleSchema.safeParse(raw);

  if (!parsed.success) throw new BundleInvalidError(API_ERRORS.IMPORT_BUNDLE_BAD_FORMAT, parsed.error.issues);

  const bundle = parsed.data;

  for (const background of bundle.backgrounds) {
    const error = backgroundReferenceError({ originFeatId: background.originFeatId, choices: background.choices }, bundle.feats, new Set(bundle.spells.map((s) => s.id)));

    if (error) throw new BundleInvalidError(error);
  }

  const warnings: string[] = [];

  const idMap = new Map<string, string>();

  for (const t of BUNDLE_TABLES) {
    const seen = new Set<string>();

    for (const row of bundle[t.key]) {
      if (seen.has(row.id)) throw new BundleInvalidError(bundleDuplicateIdMessage(t.key, row.id));

      seen.add(row.id);
      idMap.set(row.id, newContentId());
    }
  }

  if (bundle.compendium) {
    if (!tx.compendiumEntry || !tx.compendiumSource || !tx.scenarioPage) throw new BundleInvalidError(API_ERRORS.IMPORT_BUNDLE_NO_PROVENANCE);

    for (const page of bundle.compendium.pages) {
      if (idMap.has(page.id)) throw new BundleInvalidError(API_ERRORS.IMPORT_BUNDLE_DUPLICATE_PAGE_ID);

      idMap.set(page.id, newContentId());
    }
    for (const entry of bundle.compendium.entries) {
      const target = entry.kind === "scenarioPages" ? bundle.compendium.pages : bundle[entry.kind === "spell-groups" ? "spellGroups" : entry.kind];

      if (!target?.some((row) => row.id === entry.localId)) throw new BundleInvalidError(API_ERRORS.IMPORT_BUNDLE_PROVENANCE_KIND);
    }
  }

  const foreign = await findForeignContentIds(tx, idCandidates(bundle), new Set(idMap.keys()));

  if (foreign.length > 0) throw new BundleInvalidError(`Бандл посилається на контент інших кампаній: ${foreign.slice(0, 5).join(", ")}`);

  const idsByTable = new Map(BUNDLE_TABLES.map((t) => [t.key, new Set(bundle[t.key].map((r) => r.id))]));

  const remappedRows: Record<string, unknown>[] = [];

  const hashes: TableHashes = {};

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

      const sourceHash = rowHash(clean, t);

      (hashes[t.key] ??= {})[row.id] = sourceHash;

      return toPrismaJson({ ...remapped, id: idMap.get(row.id)!, campaignId: targetCampaignId, sourceId: row.id, sourceHash }, t);
    });

    return { t, rows };
  });

  assertNoLeak(remappedRows, new Set(idMap.keys()));

  for (const { t, rows } of writes) if (rows.length > 0) await delegateOf(tx, t).createMany({ data: rows });

  if (bundle.compendium) await importCompendiumSection(tx as CompendiumBundleDb, bundle.compendium, targetCampaignId, idMap);

  return { idMap, warnings, hashes };
}
