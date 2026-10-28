import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CHARACTER_PROGRESSION_ACTIONS } from "@/lib/server/assistant/actions/character-progression";
import { CHARACTER_ACTIONS } from "@/lib/server/assistant/actions/characters";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { runCharacterOperation } from "@/lib/server/characters/action-service";
import { runCharacterProgression } from "@/lib/server/characters/progression-service";
vi.mock("@/lib/cache/campaign-list", () => ({ invalidateCampaignLists: vi.fn() }));
vi.mock("@/lib/cache/tags", async original => ({ ...await original<object>(), invalidateReference: vi.fn() }));

// Route helpers and the injected executor use the SAME one-connection client.
const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));

vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  const base = new Proxy({} as PrismaClient, {
    get(_target, property) {
      if (!database.client) throw new Error("FIXTURE_DATABASE_NOT_READY");

      const value = Reflect.get(database.client, property);

      return typeof value === "function" ? value.bind(database.client) : value;
    }
  });

  return { prisma: createScopedDatabase(base) };
});

function localUrl(name: string) {
  const url = new URL(process.env[name] ?? "");

  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "54322" || url.pathname !== "/constructor") throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

  url.searchParams.set("connection_limit", "1");

  return url.toString();
}

const databaseUrl = localUrl("DATABASE_URL");

localUrl("DIRECT_URL");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });

database.client = db;

const marker = `stage6-progression-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let threadId: string;

const ownedIds = new Set<string>();

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", threadId, tokenId: null });

const executor = () => createAssistantExecutor({ db, catalog: createActionCatalog([...CHARACTER_ACTIONS, ...CHARACTER_PROGRESSION_ACTIONS]) });

describe("character progression real constructor, connection_limit=1", () => {
  beforeAll(async () => {
    await db.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });
  });
  beforeEach(async () => {
    const campaign = await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), members: { create: { userId, role: "dm" } } } });

    campaignId = campaign.id;
    ownedIds.add(campaignId);

    const thread = await db.aiThread.create({ data: { campaignId, userId, title: marker, provider: "anthropic", model: "synthetic", mode: "scenario" } });

    threadId = thread.id;
  });
  afterAll(async () => {
    // Discover owned clones even if an assertion failed immediately after creation.
    const rows = await db.campaign.findMany({ where: { dmUserId: userId }, select: { id: true, name: true, dmUserId: true, members: { select: { userId: true, role: true } } } });

    for (const row of rows) {
      if (row.name !== marker || row.dmUserId !== userId || row.members.length !== 1 || row.members[0].userId !== userId || row.members[0].role !== "dm") throw new Error("FIXTURE_OWNERSHIP_MISMATCH");

      ownedIds.add(row.id);
      await db.campaign.delete({ where: { id: row.id } });
    }
    await db.assistantReceipt.deleteMany({ where: { userId, campaignId: { in: [...ownedIds] } } });

    const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true, campaignMembers: { select: { id: true } }, dmCampaigns: { select: { id: true } } } });

    if (user) {
      if (user.displayName !== marker || user.email !== `${marker}@example.invalid` || user.campaignMembers.length || user.dmCampaigns.length) throw new Error("FIXTURE_USER_MISMATCH");

      await db.user.delete({ where: { id: userId } });
    }

    expect(await db.campaign.count({ where: { id: { in: [...ownedIds] } } })).toBe(0);
    await db.$disconnect();
  });

  const hero = async (name = "Герой") => {
    const row = await runCharacterOperation(actor(), "create", { name, type: "npc_hero", controlledBy: "", race: "Людина", class: "Герой" });

    return (row.data as { id: string }).id;
  };

  const prepare = async (operation: string, input: Record<string, unknown>) => {
    const result = await executor().dispatchAction(caller(), { actionId: `characters.${operation}`, requestId: randomUUID(), input });

    if (result.kind !== "pending") throw Error("pending required");

    return result.intent.id;
  };

  const enableOoc = () => db.campaign.update({ where: { id: campaignId }, data: { rules: { outOfCombat: { persistResources: true, xp: true, inspiration: true, longRestHitDice: "half" } } } });

  it("repeatTransferDoesNotDuplicate", async () => {
    const from = await hero("Відправник"), to = await hero("Одержувач");

    const artifact=await db.artifact.create({data:{campaignId,name:"Предмет",slot:"helmet"}});

    await db.characterInventory.update({ where: { characterId: from }, data: { stash: [artifact.id] } });

    const intent = await prepare("transfer", { characterId: from, toCharacterId: to, artifactId: artifact.id });

    const first = await executor().confirmIntent(actor(), intent);

    expect(await executor().confirmIntent(actor(), intent)).toMatchObject({ id: first.id });
    expect(await db.characterInventory.findUnique({ where: { characterId: from } })).toMatchObject({ stash: [] });
    expect(await db.characterInventory.findUnique({ where: { characterId: to } })).toMatchObject({ stash: [artifact.id] });
    expect(await db.inventoryLog.count({ where: { campaignId, kind: "artifact_transfer" } })).toBe(2);
    expect(first.result?.affected.map(t => t.id).sort()).toEqual([from, to].sort());
  });
  it("repeatXpAndRestOnce", async () => {
    await enableOoc();

    const id = await hero();

    const xp = await prepare("experience", { characterIds: [id], amount: 50 });

    await executor().confirmIntent(actor(), xp); await executor().confirmIntent(actor(), xp);
    expect(await db.character.findUnique({ where: { id } })).toMatchObject({ experience: 50 });

    const rest = await prepare("rest", { characterIds: [id], kind: "short" });

    await executor().confirmIntent(actor(), rest); await executor().confirmIntent(actor(), rest);
    expect(await db.characterLog.count({ where: { characterId: id, kind: "xp" } })).toBe(1);
    expect(await db.characterLog.count({ where: { characterId: id, kind: "short_rest" } })).toBe(1);
  });
  it("choicesPreviewThenLevelChangeStale and manual biography inventory survive", async () => {
    const id = await hero();

    await db.character.update({ where: { id }, data: { background: "Життєпис" } });
    await db.characterInventory.update({ where: { characterId: id }, data: { gold: 42, items: [{ id: "item", name: "Річ", quantity: 1 }] } });

    const intent = await prepare("choices", { characterId: id, raceChoices: {} });

    await runCharacterProgression(actor(), "level-up", { characterId: id });
    await expect(executor().confirmIntent(actor(), intent)).rejects.toMatchObject({ status: 409 });
    expect(await db.character.findUnique({ where: { id }, include: { inventory: true } })).toMatchObject({ level: 2, background: "Життєпис", inventory: { gold: 42, items: [{ id: "item", name: "Річ", quantity: 1 }] } });
  });
  it("activeBattle409 for choices/resources/rest under the shared guard", async () => {
    await enableOoc();

    const id = await hero();

    const battle = await db.battleScene.create({ data: { campaignId, name: marker, status: "active" } });

    await db.battleParticipant.create({ data: { id: randomUUID(), battleId: battle.id, sourceType: "character", sourceId: id, side: "ally", controlledBy: userId, orderIndex: 0, currentHp: 10, tempHp: 0, maxHp: 10, morale: 0, status: "alive", initiative: 10, hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false, snapshot: {}, state: {}, snapshotHash: "synthetic" } });
    for (const [operation, input] of [["choices", { characterId: id, raceChoices: {} }], ["resources", { characterId: id, hp: 1 }], ["rest", { characterIds: [id], kind: "short" }]] as const) {
      await expect(runCharacterProgression(actor(), operation, input)).rejects.toMatchObject({ status: 409 });
    }
  });
  it("roll result and log occur once only after explicit server mode confirmation", async () => {
    const id = await hero();

    const intent = await prepare("roll", { characterId: id, mode: "server", kind: "check", ability: "strength" });

    expect(await db.characterLog.count({ where: { characterId: id } })).toBe(0);

    const first = await executor().confirmIntent(actor(), intent);

    expect(await executor().confirmIntent(actor(), intent)).toMatchObject({ id: first.id, result: first.result });

    const rows = await db.characterLog.findMany({ where: { characterId: id } });

    expect(rows).toHaveLength(1); expect(rows[0].kind).toBe("check");
    expect((first.result?.data as { roll: number }).roll).toBeGreaterThanOrEqual(1);
    expect((first.result?.data as { roll: number }).roll).toBeLessThanOrEqual(20);
  });
  it("fresh content refs stale the pending choice", async () => {
    const id = await hero();

    const intent = await prepare("choices", { characterId: id, raceChoices: {} });

    await db.race.create({ data: { campaignId, name: "Нова раса" } });
    await expect(executor().confirmIntent(actor(), intent)).rejects.toMatchObject({ status: 409 });
    expect(await db.characterLog.count({ where: { characterId: id } })).toBe(0);
  });
  it("5e class level-up applies ASI choices and journal exactly once", async () => {
    await db.campaign.update({ where: { id: campaignId }, data: { rules: { classes: { enabled: true } } } });

    const feat = await db.feat.create({ data: { campaignId, name: "ASI", repeatable: true, type: "general", prerequisite: { level: 4 }, choices: [{ id: "asi", label: "ASI", level: 1, count: 1, kind: "abilityScore", points: 2, max: 20 }] } });

    const cls = await db.gameClass.create({ data: { campaignId, name: "Клас", hitDie: 8, features: [{ level: 4, abilities: [], choices: [{ id: "asi-4", label: "ASI", level: 4, count: 1, kind: "feat", featTypes: ["general"] }] }] } });

    const created = await runCharacterOperation(actor(), "create", { name: "Герой", type: "npc_hero", controlledBy: "", race: "Людина", classes: [{ classId: cls.id, level: 3 }], charisma: 17 });

    const id = (created.data as { id: string }).id;

    const intent = await prepare("level-up", { characterId: id, classId: cls.id, choices: { "asi-4": [{ id: feat.id, picks: { asi: [{ id: "charisma" }, { id: "charisma" }] } }] } });

    await executor().confirmIntent(actor(), intent); await executor().confirmIntent(actor(), intent);
    expect(await db.character.findUnique({ where: { id } })).toMatchObject({ level: 4, charisma: 19 });
    expect(await db.characterLog.count({ where: { characterId: id, kind: "choices_edit" } })).toBe(1);
  });
  it("level-up result cannot expose another owner's private notes", async () => {
    const id = await hero();

    const owner = await db.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@example.invalid`, displayName: marker } });

    try {
      await db.character.update({ where: { id }, data: { controlledBy: owner.id, notes: "PRIVATE_PLAYER_NOTES" } });

      const result = await runCharacterProgression(actor(), "level-up", { characterId: id });

      expect(JSON.stringify(result)).not.toContain("PRIVATE_PLAYER_NOTES");
    } finally {
      await db.character.deleteMany({ where: { id, campaignId, controlledBy: owner.id } });
      await db.user.delete({ where: { id: owner.id } });
    }
  });

  it("sheet progression logs stash and inventory reads remain pure", async () => {
    const id = await hero();

    await db.characterInventory.delete({ where: { characterId: id } });
    for (const operation of ["sheet", "progression", "log", "stash.log", "stash", "inventory", "stash.free-artifacts"]) {
      const result = await runCharacterProgression(actor(), operation, operation === "stash.free-artifacts" ? {} : { characterId: id });

      expect(result.data).toBeDefined(); expect(JSON.stringify(result)).not.toContain("inviteCode");
    }
    expect(await db.characterInventory.count({ where: { characterId: id } })).toBe(0);
    expect(await db.characterLog.count({ where: { characterId: id } })).toBe(0);
  });

  it("foreign nested inventory ref is rejected during preview before any write",async()=>{
    const id=await hero();

    const other=await db.campaign.create({data:{name:marker,dmUserId:userId,inviteCode:randomUUID(),members:{create:{userId,role:"dm"}}}});

    ownedIds.add(other.id);

    const artifact=await db.artifact.create({data:{campaignId:other.id,name:"Чужий",slot:"weapon"}});

    await expect(prepare("inventory.patch",{characterId:id,equipSlot:{slot:"weapon",artifactId:artifact.id}})).rejects.toMatchObject({status:404});
    expect(await db.characterInventory.findUnique({where:{characterId:id}})).toMatchObject({equipped:{}});
    expect(await db.inventoryLog.count({where:{characterId:id}})).toBe(0);
  });

});
