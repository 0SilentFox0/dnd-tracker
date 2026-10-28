import { Prisma } from "@prisma/client";

import "server-only";

type Db = Pick<Prisma.TransactionClient, "$queryRaw">;

export const UPDATED_AT_TABLES = {
  Campaign: "campaigns", Character: "characters", CharacterInventory: "character_inventories", CharacterSkills: "character_skills",
  Race: "races", GameClass: "classes", Feat: "feats", Background: "backgrounds", MainSkill: "main_skills",
  ScenarioPage: "scenario_pages", SlideDeck: "slide_decks", CampaignShow: "campaign_shows",
} as const;

export const FULL_ROW_TABLES = ["units", "spells", "spell_groups", "artifacts", "artifact_sets", "skills", "skill_trees", "campaign_tracks"] as const;

export type StampModel = keyof typeof UPDATED_AT_TABLES;
export type FullRowTable = (typeof FULL_ROW_TABLES)[number];
export type Stamp = { id: string; updatedAt: Date; scenarioPageId?: string | null; version?: number };

const lowerFirst = (value: string) => value[0].toLowerCase() + value.slice(1);

/** bindDeckRecord preserves SlideDeck.updatedAt, so its binding is part of the stamp. */
export async function stampDigest(db: object, model: StampModel, where: object, extra: Record<string, true> = {}): Promise<Stamp[]> {
  const select = { id: true, updatedAt: true, ...(model === "SlideDeck" && { scenarioPageId: true }), ...extra };

  const delegate = (db as Record<string, { findMany: (args: unknown) => Promise<Stamp[]> }>)[lowerFirst(model)];

  return delegate.findMany({ where, select, orderBy: { id: "asc" } });
}

/** Full-row hash computed in Postgres: same semantics as hashing every row, ~32 bytes of egress. */
export async function fullRowDigest(db: Db, table: FullRowTable, campaignId: string): Promise<string> {
  if (!(FULL_ROW_TABLES as readonly string[]).includes(table)) throw new Error("DIGEST_TABLE_NOT_ALLOWED");

  const rows = await db.$queryRaw<Array<{ digest: string | null }>>(Prisma.sql`SELECT md5(string_agg(md5(t::text), '' ORDER BY t.id)) AS digest FROM ${Prisma.raw(`"${table}"`)} t WHERE t."campaignId" = ${campaignId}`);

  return rows[0]?.digest ?? "";
}
