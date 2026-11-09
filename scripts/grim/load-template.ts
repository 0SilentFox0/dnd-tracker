#!/usr/bin/env tsx
// pnpm constructor:grim-template [--owner <userId>] [--allow-remote]   (GRIM_DATA_DIR overrides the data dir)
import { isDeepStrictEqual } from "node:util";

import { assertSeedTarget } from "../seed/seed-library-lib";
import { ensureSrdTemplate, formatImportSummary, hasRowErrors, importSrdData } from "../srd/lib/load-template";
import { makeTemplateStore } from "../srd/lib/template-store";
import { GRIM_DATA_DIR, GRIM_ROW_KINDS, type GrimData, readGrimData, readGrimManifest } from "./data";
import { validateGrimData } from "./validate-data";

import { GRIM_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { importContent, OFFLINE_IMPORT_DEPS } from "@/lib/server/content/import/import-content";
import { saveRaceProfile } from "@/lib/server/races/race-profile";
import { publishTemplate } from "@/lib/server/templates/publish-service";
import type { Actor } from "@/lib/utils/api/actor";
import { nameKey } from "@/lib/utils/content/import";
import { mergeRules } from "@/lib/utils/rules/schema";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

export const GRIM_TEMPLATE_DESCRIPTION = "Grim d100: a grimdark percentile rule system with its own species, careers, talents and bestiary";

export interface GrimLoadArgs {
  owner?: string;
  dir?: string;
  allowRemote: boolean;
}

export interface GrimLoadResult {
  templateId: string;
  created: boolean;
  counts: Record<string, number>;
}

const noop = () => undefined;

const idMap = (rows: Array<{ id: string; name: string }>) => new Map(rows.map((r) => [nameKey(r.name), r.id]));

const asStored = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

function resolveProfile(profile: GrimData["raceProfiles"][number]["profile"], ids: { feats: Map<string, string>; careers: Map<string, string> }): SpeciesProfile {
  const feat = (name: string) => ids.feats.get(nameKey(name)) as string;

  return {
    ...profile,
    talents: profile.talents.map(feat),
    randomTalents: profile.randomTalents.map((r) => ({ ...r, featId: feat(r.featId) })),
    careerTable: profile.careerTable.map((r) => ({ ...r, careerId: ids.careers.get(nameKey(r.careerId)) as string })),
  };
}

async function writeRaceProfiles(campaignId: string, data: GrimData): Promise<number> {
  if (data.raceProfiles.length === 0) return 0;

  const where = { campaignId };

  const select = { id: true, name: true };

  const [feats, careers, raceRows] = await Promise.all([prisma.feat.findMany({ where, select }), prisma.career.findMany({ where, select }), prisma.race.findMany({ where, select: { ...select, profile: true } })]);

  const [featIds, careerIds, races] = [feats, careers, raceRows].map(idMap);

  const stored = new Map(raceRows.map((r) => [r.id, r.profile]));

  for (const { race, profile } of data.raceProfiles) {
    const raceId = races.get(nameKey(race));

    if (!raceId) throw new Error(`Вид "${race}" не знайдено в шаблоні після імпорту`);

    const resolved = resolveProfile(profile, { feats: featIds, careers: careerIds });

    if (!isDeepStrictEqual(asStored(resolved), stored.get(raceId))) await saveRaceProfile(campaignId, raceId, resolved, noop);
  }

  return data.raceProfiles.length;
}

export async function loadGrimTemplate({ owner, dir = GRIM_DATA_DIR, allowRemote }: GrimLoadArgs): Promise<GrimLoadResult> {
  const data = readGrimData(dir);

  const validation = validateGrimData(data);

  if (!validation.ok) throw new Error(`Дані Grim d100 невалідні:\n${validation.issues.map((i) => `  ${i}`).join("\n")}`);

  const manifest = readGrimManifest(dir);

  const merged = mergeRules(WFRP_RULES, (data.rules ?? {}) as Parameters<typeof mergeRules>[1]);

  if (!merged.ok) throw new Error("rules.json не проходить схему правил");

  assertSeedTarget(process.env.DATABASE_URL, allowRemote);

  const template = await ensureSrdTemplate(makeTemplateStore(GRIM_TEMPLATE_NAME), { owner, rules: merged.rules, credits: manifest.credits, description: GRIM_TEMPLATE_DESCRIPTION });

  console.info(`${GRIM_TEMPLATE_NAME}: ${template.id}${template.created ? " (створено)" : ""}`);

  const { contentVersion: versionBefore } = await prisma.campaign.findUniqueOrThrow({ where: { id: template.id }, select: { contentVersion: true } });

  const actor: Actor = { campaignId: template.id, userId: template.dmUserId, isDM: true, via: "session", scopes: null };

  const results = await importSrdData(data, (kind, rows) => importContent(actor, kind, { rows, mode: "update", dryRun: false }, OFFLINE_IMPORT_DEPS), undefined, GRIM_ROW_KINDS);

  for (const line of formatImportSummary(results)) console.info(line);

  if (hasRowErrors(results)) throw new Error("Імпорт Grim d100 завершився з помилками рядків; шаблон не опубліковано");

  const profiles = await writeRaceProfiles(template.id, data);

  const published = await publishTemplate(actor);

  const unchanged = published.added + published.changed + published.removed === 0;

  // update-mode import rewrites every row (one version bump each); with nothing published that churn would only prompt clones to sync
  if (unchanged) await prisma.campaign.update({ where: { id: template.id }, data: { contentVersion: versionBefore } });

  console.info(`Версія шаблону ${published.version}: +${published.added} ~${published.changed} -${published.removed}`);

  return { templateId: template.id, created: template.created, counts: { ...Object.fromEntries(GRIM_ROW_KINDS.map((k) => [k, data[k].length])), raceProfiles: profiles } };
}

function parseArgs(args: string[]): GrimLoadArgs {
  const ownerIndex = args.indexOf("--owner");

  const owner = ownerIndex < 0 ? undefined : args[ownerIndex + 1];

  if (ownerIndex >= 0 && (!owner || owner.startsWith("--"))) throw new Error("Вкажіть --owner <userId>");

  return { owner, allowRemote: args.includes("--allow-remote") };
}

if (process.argv[1]?.endsWith("scripts/grim/load-template.ts")) {
  loadGrimTemplate(parseArgs(process.argv.slice(2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
