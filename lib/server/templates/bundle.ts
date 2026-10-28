import { Prisma } from "@prisma/client";
import { z } from "zod";

import { CONTENT_ID_RE } from "./ids";

import type { SYNC_TABLE_SCOPES } from "@/lib/constants/source-sync";

export type BundleTable = (typeof SYNC_TABLE_SCOPES)[number];

type Delegate = "spellGroup" | "race" | "gameClass" | "feat" | "unit" | "spell" | "mainSkill" | "skill" | "skillTree" | "artifactSet" | "artifact" | "campaignTrack";

export interface BundleTableDef {
  key: BundleTable;
  model: Prisma.ModelName;
  delegate: Delegate;
  columns: readonly string[];
  nullableJson: readonly string[];
  fks: Partial<Record<string, BundleTable>>;
}

const EXCLUDED_COLUMNS = new Set(["campaignId", "createdAt", "updatedAt", "sourceId", "sourceHash"]);

const SCALAR_ENUMS = {
  SpellGroup: Prisma.SpellGroupScalarFieldEnum,
  Race: Prisma.RaceScalarFieldEnum,
  GameClass: Prisma.GameClassScalarFieldEnum,
  Feat: Prisma.FeatScalarFieldEnum,
  Unit: Prisma.UnitScalarFieldEnum,
  Spell: Prisma.SpellScalarFieldEnum,
  MainSkill: Prisma.MainSkillScalarFieldEnum,
  Skill: Prisma.SkillScalarFieldEnum,
  SkillTree: Prisma.SkillTreeScalarFieldEnum,
  ArtifactSet: Prisma.ArtifactSetScalarFieldEnum,
  Artifact: Prisma.ArtifactScalarFieldEnum,
  CampaignTrack: Prisma.CampaignTrackScalarFieldEnum,
} as const;

const MODEL_TO_KEY: Record<keyof typeof SCALAR_ENUMS, BundleTable> = {
  SpellGroup: "spellGroups",
  Race: "races",
  GameClass: "classes",
  Feat: "feats",
  Unit: "units",
  Spell: "spells",
  MainSkill: "mainSkills",
  Skill: "skills",
  SkillTree: "skillTrees",
  ArtifactSet: "artifactSets",
  Artifact: "artifacts",
  CampaignTrack: "tracks",
};

function deriveFks(fields: readonly Prisma.DMMF.Field[]): Partial<Record<string, BundleTable>> {
  const fks: Partial<Record<string, BundleTable>> = {};

  for (const f of fields) {
    const target = MODEL_TO_KEY[f.type as keyof typeof MODEL_TO_KEY];

    if (f.kind === "object" && target && f.relationFromFields?.length === 1) fks[f.relationFromFields[0]] = target;
  }

  return fks;
}

function table(key: BundleTable, model: keyof typeof SCALAR_ENUMS, delegate: Delegate): BundleTableDef {
  const columns = Object.values(SCALAR_ENUMS[model]).filter((c) => !EXCLUDED_COLUMNS.has(c));

  const fields = Prisma.dmmf.datamodel.models.find((m) => m.name === model)?.fields ?? [];

  const nullableJson = fields.filter((f) => f.type === "Json" && !f.isRequired && (columns as readonly string[]).includes(f.name)).map((f) => f.name);

  return { key, model, delegate, columns, nullableJson, fks: deriveFks(fields) };
}

export const BUNDLE_TABLES: ReadonlyArray<BundleTableDef> = [
  table("spellGroups", "SpellGroup", "spellGroup"),
  table("races", "Race", "race"),
  table("classes", "GameClass", "gameClass"),
  table("feats", "Feat", "feat"),
  table("units", "Unit", "unit"),
  table("spells", "Spell", "spell"),
  table("mainSkills", "MainSkill", "mainSkill"),
  table("skills", "Skill", "skill"),
  table("skillTrees", "SkillTree", "skillTree"),
  table("artifactSets", "ArtifactSet", "artifactSet"),
  table("artifacts", "Artifact", "artifact"),
  table("tracks", "CampaignTrack", "campaignTrack"),
];

const perTable = <T>(make: () => T) => Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, make()])) as Record<BundleTable, T>;

const rowSchema = z.array(z.looseObject({ id: z.string().regex(CONTENT_ID_RE) })).max(5000);

export const BundleSchema = z.object({
  formatVersion: z.literal(1),
  settings: z.strictObject({
    maxLevel: z.number().min(1).max(30),
    xpMultiplier: z.number().min(0).max(10),
    allowPlayerEdit: z.boolean(),
    friendlyFire: z.boolean(),
  }),
  rules: z.unknown(),
  credits: z.string().max(10_000).nullable().optional(),
  ...perTable(() => rowSchema),
  classes: rowSchema.default([]),
  feats: rowSchema.default([]),
}) as unknown as z.ZodType<Bundle>;

export type Bundle = {
  formatVersion: 1;
  settings: { maxLevel: number; xpMultiplier: number; allowPlayerEdit: boolean; friendlyFire: boolean };
  rules: unknown;
  credits?: string | null;
} & Record<BundleTable, Array<Record<string, unknown> & { id: string }>>;

export function emptyBundle(): Bundle {
  return {
    formatVersion: 1,
    settings: { maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, friendlyFire: false },
    rules: {},
    ...perTable(() => []),
  };
}

export type TemplateDb = Pick<
  Prisma.TransactionClient,
  "spellGroup" | "race" | "gameClass" | "feat" | "unit" | "spell" | "mainSkill" | "skill" | "skillTree" | "artifactSet" | "artifact" | "campaignTrack" | "campaign"
>;

export class TemplateLeakError extends Error {}

export class BundleInvalidError extends Error {
  constructor(
    message: string,
    public issues?: unknown,
  ) {
    super(message);
  }
}

export const BUNDLE_SETTING_KEYS = ["maxLevel", "xpMultiplier", "allowPlayerEdit", "friendlyFire"] as const;

export type BundleSettingKey = (typeof BUNDLE_SETTING_KEYS)[number];

export const SETTINGS_SELECT = Object.fromEntries(BUNDLE_SETTING_KEYS.map((k) => [k, true])) as Record<BundleSettingKey, true>;

export function pick(row: Record<string, unknown>, columns: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const c of columns) if (c in row) out[c] = row[c];

  return out;
}

export const settingsOf = (row: Record<string, unknown>) => pick(row, BUNDLE_SETTING_KEYS) as Bundle["settings"];

export function toPrismaJson(row: Record<string, unknown>, t: BundleTableDef) {
  const out = { ...row };

  for (const col of t.nullableJson) if (out[col] === null) out[col] = Prisma.DbNull;

  return out;
}

export interface RowDelegate {
  findMany(args: unknown): Promise<Array<Record<string, unknown>>>;
  createMany(args: { data: unknown[] }): Promise<unknown>;
  updateMany(args: { where: Record<string, unknown>; data: unknown }): Promise<{ count: number }>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
}

export const delegateOf = (db: TemplateDb, t: BundleTableDef) => db[t.delegate] as unknown as RowDelegate;
