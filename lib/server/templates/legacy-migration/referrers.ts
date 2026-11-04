import { Prisma } from "@prisma/client";

import type { Referrer } from "./types";

import { ParticipantSourceType } from "@/lib/constants/battle";
import type { NotificationType } from "@/lib/constants/notifications";
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { notificationHref } from "@/lib/utils/notifications/href";

export type { Referrer, ReferrerMode } from "./types";

const PREPARED = "prepared";

const PENDING = "pending";

const tableOf = (model: Prisma.ModelName) => Prisma.dmmf.datamodel.models.find((m) => m.name === model)?.dbName ?? model;

const own = (campaignId: string) => ({ campaignId });

const viaCharacter = (campaignId: string) => ({ character: { campaignId } });

const viaBattle = (campaignId: string) => ({ battle: { campaignId } });

const viaPage = (campaignId: string) => ({ page: { campaignId } });

const viaThread = (campaignId: string) => ({ thread: { campaignId } });

const preparedBattle = (campaignId: string) => ({ campaignId, status: PREPARED });

const finishedBattle = (campaignId: string) => ({ campaignId, status: { not: PREPARED } });

const lockOwn = (model: Prisma.ModelName, extra?: Prisma.Sql, pk = "id") => (campaignId: string) => Prisma.sql`SELECT ${Prisma.raw(`"${pk}"`)} FROM ${Prisma.raw(`"${tableOf(model)}"`)} WHERE "campaignId" = ${campaignId}${extra ?? Prisma.empty} FOR UPDATE`;

const lockVia = (model: Prisma.ModelName, fk: string, parent: Prisma.ModelName, extra?: Prisma.Sql) => (campaignId: string) =>
  Prisma.sql`SELECT id FROM ${Prisma.raw(`"${tableOf(model)}"`)} WHERE ${Prisma.raw(`"${fk}"`)} IN (SELECT id FROM ${Prisma.raw(`"${tableOf(parent)}"`)} WHERE "campaignId" = ${campaignId}${extra ?? Prisma.empty}) FOR UPDATE`;

const PARTICIPANT_COLUMNS = ["sourceId", "snapshot", "state"] as const;

const content: Referrer[] = BUNDLE_TABLES.map((t) => ({ model: t.model, mode: "content", scope: own, columns: t.columns }));

const remap = (model: Prisma.ModelName, columns: readonly string[], rest: Partial<Referrer> = {}): Referrer => ({ model, mode: "remap", scope: own, columns, ...rest });

const history = (model: Prisma.ModelName, scope: Referrer["scope"] = own): Referrer => ({ model, mode: "history", scope });

const none = (model: Prisma.ModelName, scope: Referrer["scope"] = own): Referrer => ({ model, mode: "none", scope });

const global = (model: Prisma.ModelName): Referrer => ({ model, mode: "global" });

export const REFERRERS: readonly Referrer[] = [
  ...content,
  remap("Campaign", ["rules"], { scope: (id) => ({ id }), lockSql: (id) => Prisma.sql`SELECT id FROM "campaigns" WHERE id = ${id} FOR UPDATE` }),
  remap("Character", ["backgroundId", "personalSkillId", "knownSpells", "classes", "feats", "raceChoices", "backgroundChoices", "backgroundFeatPicks", "skillTreeProgress", "resources", "spellSlots", "proficiencies", "skills", "savingThrows", "immunities", "languages", "goals"], { lockSql: lockOwn("Character") }),
  remap("CharacterInventory", ["equipped", "backpack", "items", "stash", "attuned"], { scope: viaCharacter, lockSql: lockVia("CharacterInventory", "characterId", "Character") }),
  remap("CharacterSkills", ["skillTreeId", "unlockedSkills"], { scope: viaCharacter, lockSql: lockVia("CharacterSkills", "characterId", "Character") }),
  remap("InventoryLog", ["delta"], { lockSql: lockOwn("InventoryLog") }),
  remap("CharacterLog", ["data"], { lockSql: lockOwn("CharacterLog") }),
  remap("BattleScene", ["participants", "map", "audio", "rules", "pendingMoraleCheck", "pendingCritChoice"], { scope: preparedBattle, lockSql: lockOwn("BattleScene", Prisma.sql` AND status = ${PREPARED}`) }),
  history("BattleScene", finishedBattle),
  remap("BattleParticipant", PARTICIPANT_COLUMNS, {
    scope: (id) => ({ battle: preparedBattle(id) }),
    columnsFor: (row) => (row.sourceType === ParticipantSourceType.UNIT ? PARTICIPANT_COLUMNS : PARTICIPANT_COLUMNS.filter((c) => c !== "sourceId")),
    derive: (row) => ({ snapshotHash: hashJson(row.snapshot) }),
    lockSql: lockVia("BattleParticipant", "battleId", "BattleScene", Prisma.sql` AND status = ${PREPARED}`),
  }),
  history("BattleParticipant", (id) => ({ battle: finishedBattle(id) })),
  history("BattleEvent", viaBattle),
  history("BattleSnapshot", viaBattle),
  remap("CampaignShow", ["audio", "battle", "slide", "cover", "world"], { pk: "campaignId", lockSql: lockOwn("CampaignShow", undefined, "campaignId") }),
  remap("SlideDeck", ["slides"], { lockSql: lockOwn("SlideDeck") }),
  remap("ScenarioPage", ["content"], { lockSql: lockOwn("ScenarioPage") }),
  remap("ScenarioPageIndex", ["facts"], { pk: "pageId", lockSql: lockOwn("ScenarioPageIndex", undefined, "pageId") }),
  history("ScenarioPageVersion", viaPage),
  history("ScenarioPageSummary"),
  remap("CompendiumEntry", ["localId", "bindings", "baseline", "locator"], { lockSql: lockOwn("CompendiumEntry") }),
  history("CompendiumImportRun"),
  none("CompendiumSource"),
  remap("PlayerNotification", ["refId"], {
    derive: (row, campaignId) => ({ href: notificationHref(campaignId, row.type as NotificationType, String(row.refId)) }),
    lockSql: lockOwn("PlayerNotification"),
  }),
  remap("AiProposal", ["ops"], { scope: (id) => ({ campaignId: id, status: PENDING }), lockSql: lockOwn("AiProposal", Prisma.sql` AND status = ${PENDING}`) }),
  history("AiProposal", (id) => ({ campaignId: id, status: { not: PENDING } })),
  history("AiThread"),
  history("AiMessage", viaThread),
  history("AssistantIntent"),
  history("AssistantReceipt"),
  history("AssistantRun", viaThread),
  { model: "CampaignSourceSync", mode: "special", scope: own, columns: ["ignored", "sourceVersion"] },
  { model: "CampaignContentHide", mode: "special", scope: own },
  none("CampaignMember"),
  none("ApiToken"),
  none("CharacterToken", viaCharacter),
  none("WorldMap"),
  none("WorldMarker", (id) => ({ map: { campaignId: id } })),
  none("WorldPosition"),
  none("WorldReveal", (id) => ({ map: { campaignId: id } })),
  none("WorldTravelLog"),
  none("WorldNote", (id) => ({ marker: { map: { campaignId: id } } })),
  none("Acquaintance"),
  none("AcquaintanceEntry", (id) => ({ acquaintance: { campaignId: id } })),
  none("AcquaintanceNote", (id) => ({ acquaintance: { campaignId: id } })),
  global("User"),
  global("AiCredential"),
  global("UserOnboardingFlag"),
  global("StatusEffect"),
  ...[...Prisma.dmmf.datamodel.models].filter((m) => m.name.endsWith("Base")).map((m) => global(m.name as Prisma.ModelName)),
];

const delegateOf = (model: string) => `${model[0].toLowerCase()}${model.slice(1)}`;

export async function referrerRows(db: object, r: Referrer, campaignId: string): Promise<Array<Record<string, unknown>>> {
  if (r.mode === "global" || !r.scope) return [];

  const delegate = (db as Record<string, { findMany: (args: unknown) => Promise<Array<Record<string, unknown>>> }>)[delegateOf(r.model)];

  return delegate.findMany({ where: r.scope(campaignId) });
}
