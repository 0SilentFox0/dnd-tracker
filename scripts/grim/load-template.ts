#!/usr/bin/env tsx
// pnpm constructor:grim-template [--owner <userId>] [--allow-remote]   (GRIM_DATA_DIR overrides the data dir)
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { assertSeedTarget } from "../seed/seed-library-lib";
import { formatImportSummary, hasRowErrors, importSrdData } from "../srd/lib/load-template";
import type { Pack } from "../templates/lib/pack";
import { ensureTemplate, makeTemplateStore } from "../templates/lib/store";
import { validatePack } from "../templates/lib/validate";
import { grimCoverage, grimInfo } from "../templates/systems/wfrp/coverage";
import { GRIM_DATA_DIR, GRIM_ROW_KINDS, type GrimData, readGrimData, readGrimManifest } from "./data";
import { grimIconGaps, grimIconIssues, readGrimIcons, withGrimIcons } from "./icons";

import { prisma } from "@/lib/db";
import { importContent, OFFLINE_IMPORT_DEPS } from "@/lib/server/content/import/import-content";
import { saveRaceProfile } from "@/lib/server/races/race-profile";
import { publishTemplate } from "@/lib/server/templates/publish-service";
import type { Actor } from "@/lib/utils/api/actor";
import { jsonContent } from "@/lib/utils/common/json";
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
  published: { added: number; changed: number; removed: number };
}

const noop = () => undefined;

const idMap = (rows: Array<{ id: string; name: string }>) => new Map(rows.map((r) => [nameKey(r.name), r.id]));

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

  const [feats, careers, raceRows] = await Promise.all([prisma.feat.findMany({ where, select }), prisma.career.findMany({ where, select }), prisma.race.findMany({ where, select: { ...select, slug: true, profile: true } })]);

  const [featIds, careerIds] = [feats, careers].map(idMap);

  const races = new Map(raceRows.flatMap((r) => (r.slug ? [[r.slug, r.id] as const] : [])));

  const stored = new Map(raceRows.map((r) => [r.id, r.profile]));

  for (const { race, profile } of data.raceProfiles) {
    const raceId = races.get(race);

    if (!raceId) throw new Error(`Вид зі slug "${race}" не знайдено в шаблоні після імпорту`);

    const resolved = resolveProfile(profile, { feats: featIds, careers: careerIds });

    if (!isDeepStrictEqual(jsonContent(resolved), stored.get(raceId))) await saveRaceProfile(campaignId, raceId, resolved, noop);
  }

  return data.raceProfiles.length;
}

export async function loadGrimTemplate({ owner, dir = GRIM_DATA_DIR, allowRemote }: GrimLoadArgs): Promise<GrimLoadResult> {
  const data = readGrimData(dir);

  const manifest = readGrimManifest(dir);

  const pack: Pack = { manifest, rules: data.rules as Pack["rules"], rows: Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, data[kind]])) as Pack["rows"], extras: { "race-profiles": data.raceProfiles }, icons: {} };

  const validation = validatePack(pack, { dir: path.dirname(dir) }).filter((issue) => issue.level === "error" && !issue.message.startsWith("manifest: counts"));

  const icons = readGrimIcons(dir);

  const issues = [...validation.map((issue) => issue.message), ...grimIconIssues(data, icons)];

  if (issues.length > 0) throw new Error(`Дані Grim d100 невалідні:\n${issues.map((i) => `  ${i}`).join("\n")}`);

  for (const gap of grimIconGaps(data, icons)) console.warn(gap);

  for (const warning of grimCoverage(data)) console.warn(warning);

  for (const line of grimInfo(data)) console.info(line);

  const merged = mergeRules(WFRP_RULES, (data.rules ?? {}) as Parameters<typeof mergeRules>[1]);

  if (!merged.ok) throw new Error("rules.json не проходить схему правил");

  assertSeedTarget(process.env.DATABASE_URL, allowRemote);

  const template = await ensureTemplate(makeTemplateStore(manifest), { owner, rules: merged.rules, credits: manifest.credits ?? "", description: GRIM_TEMPLATE_DESCRIPTION });

  console.info(`${manifest.names.en}: ${template.id}${template.created ? " (створено)" : ""}`);

  const { contentVersion: versionBefore } = await prisma.campaign.findUniqueOrThrow({ where: { id: template.id }, select: { contentVersion: true } });

  const actor: Actor = { campaignId: template.id, userId: template.dmUserId, isDM: true, via: "session", scopes: null };

  const results = await importSrdData(withGrimIcons(data, icons), (kind, rows) => importContent(actor, kind, { rows, mode: "update", dryRun: false }, OFFLINE_IMPORT_DEPS), undefined, GRIM_ROW_KINDS);

  for (const line of formatImportSummary(results)) console.info(line);

  if (hasRowErrors(results)) throw new Error("Імпорт Grim d100 завершився з помилками рядків; шаблон не опубліковано");

  const profiles = await writeRaceProfiles(template.id, data);

  const published = await publishTemplate(actor);

  const unchanged = published.added + published.changed + published.removed === 0;

  // update-mode import rewrites every row (one version bump each); with nothing published that churn would only prompt clones to sync
  if (unchanged) await prisma.campaign.update({ where: { id: template.id }, data: { contentVersion: versionBefore } });

  console.info(`Версія шаблону ${published.version}: +${published.added} ~${published.changed} -${published.removed}`);

  return { templateId: template.id, created: template.created, published: { added: published.added, changed: published.changed, removed: published.removed }, counts: { ...Object.fromEntries(GRIM_ROW_KINDS.map((k) => [k, data[k].length])), raceProfiles: profiles } };
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
