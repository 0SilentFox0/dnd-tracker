import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CHARACTER_ACTIONS } from "@/lib/server/assistant/actions/characters";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { runCharacterOperation } from "@/lib/server/characters/action-service";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";
vi.mock("@/lib/cache/campaign-list", () => ({ invalidateCampaignLists: vi.fn() }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn(), ReferenceKind: { RACES: "races" } }));

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

const localUrl = (name: "DATABASE_URL" | "DIRECT_URL") => singleConnectionDatabaseUrl(name);

const databaseUrl = localUrl("DATABASE_URL");

localUrl("DIRECT_URL");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });

database.client = db;

const marker = `stage6-character-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let threadId: string;

const ownedIds = new Set<string>();

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", threadId, tokenId: null });

const executor = () => createAssistantExecutor({ db, catalog: createActionCatalog(CHARACTER_ACTIONS) });

describe.skipIf(!isLocalDevDatabaseEnv())("character management real constructor, connection_limit=1", () => {
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
  it("sameCreateHttpAndToolDefaults and game token audit persist atomically", async () => {
    const prepared = await executor().dispatchAction(caller(), { actionId: "characters.create", requestId: randomUUID(), input: { name: "Герой", type: "npc_hero", controlledBy: "", race: "Людина", class: "Герой" } });

    if (prepared.kind !== "pending") throw Error("pending required");

    const receipt = await executor().confirmIntent(actor(), prepared.intent.id);

    const id = (receipt.result?.data as { id: string }).id;

    const row = await db.character.findUniqueOrThrow({ where: { id }, include: { inventory: true } });

    expect(row).toMatchObject({ level: 1, controlledBy: userId, status: "active", skillTreeProgress: {}, inventory: { gold: 0, items: [] } });
    expect(await executor().confirmIntent(actor(), prepared.intent.id)).toMatchObject({ id: receipt.id });
    expect(await db.character.count({ where: { campaignId } })).toBe(1);

    const token = await runCharacterOperation(actor(), "tokens.create", { characterId: id, color: "red", label: "Жетон" });

    expect((token.data as { token: { label: string } }).token.label).toBe("Жетон");
    expect(await db.characterToken.findFirst({ where: { characterId: id } })).toMatchObject({ createdBy: userId });
  });
  it("HTTP shared handler changes make pending notes stale without biography loss", async () => {
    const created = await runCharacterOperation(actor(), "create", { name: "Герой", type: "npc_hero", controlledBy: "", race: "Людина", class: "Герой" });

    const id = (created.data as { id: string }).id;

    await db.character.update({ where: { id }, data: { background: "Життєпис" } });

    const prepared = await executor().dispatchAction(caller(), { actionId: "characters.notes", requestId: randomUUID(), input: { characterId: id, notes: "Перша" } });

    if (prepared.kind !== "pending") throw Error("pending required");

    const { PUT } = await import("@/lib/server/characters/operations/notes");

    expect((await PUT(new Request("http://local", { method: "PUT", body: JSON.stringify({ notes: "Друга" }) }), { params: Promise.resolve({ id: campaignId, characterId: id }) }, actor())).status).toBe(200);
    await expect(executor().confirmIntent(actor(), prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.character.findUnique({ where: { id } })).toMatchObject({ notes: "Друга", background: "Життєпис" });
  });
  it("new character deletion cascade dependency makes its intent stale",async()=>{
    const created=await runCharacterOperation(actor(),"create",{name:"Герой",type:"npc_hero",controlledBy:"",race:"Людина",class:"Герой"});

    const id=(created.data as {id:string}).id;

    const prepared=await executor().dispatchAction(caller(),{actionId:"characters.delete",requestId:randomUUID(),input:{characterId:id}});

    if(prepared.kind!=="pending")throw Error("pending required");

    await db.characterLog.create({data:{campaignId,characterId:id,actorUserId:userId,kind:"check",data:{label:"Нова подія"}}});
    await expect(executor().confirmIntent(actor(),prepared.intent.id)).rejects.toMatchObject({status:409});
    expect(await db.character.count({where:{id}})).toBe(1);
  });

});
