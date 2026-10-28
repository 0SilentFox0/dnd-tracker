import { beforeEach, expect, it, vi } from "vitest";

import { CHARACTER_ACTIONS } from "@/lib/server/assistant/actions/characters";
import { confirmationFor } from "@/lib/server/assistant/policy";
import { runCharacterOperation } from "@/lib/server/characters/action-service";
import { parseRules } from "@/lib/utils/rules/schema";

const h = vi.hoisted(() => ({ character: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), deleteMany: vi.fn() }, campaign: { findUnique: vi.fn() }, campaignMember: { findFirst: vi.fn(), findMany: vi.fn() }, user: { findUnique: vi.fn() }, characterToken: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() }, gameClass: { findMany: vi.fn(async () => []) }, background: { findMany: vi.fn(async () => []) }, feat: { findMany: vi.fn(async () => []) }, spell: { findMany: vi.fn(async () => []) }, skill: { findMany: vi.fn(async () => []) }, mainSkill: { findMany: vi.fn(async () => []) }, skillTree: { findMany: vi.fn(async () => []) }, artifact: { findMany: vi.fn(async () => []) }, artifactSet: { findMany: vi.fn(async () => []) }, spellGroup: { findMany: vi.fn(async () => []) }, race: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) }, characterInventory: { create: vi.fn() }, $queryRaw: vi.fn(async () => [{ id: "c" }]) }));

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => new Response()), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { ...h, $transaction: (fn: (tx: typeof h) => unknown) => fn(h) } }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async () => ({ ok: true, avatar: null })) }));

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

beforeEach(() => { vi.clearAllMocks(); h.campaign.findUnique.mockResolvedValue({ id: "c", kind: "campaign", maxLevel: 20, rules: parseRules(null), allowPlayerEdit: true, members: [{ userId: "dm", role: "dm" }] }); h.character.findUnique.mockResolvedValue({ id: "hero", campaignId: "c", controlledBy: "dm", name: "Герой", status: "active", goals: [], notes: "", biography: "Життєпис", inventory: {}, classes: [] }); h.character.findMany.mockResolvedValue([]); h.characterToken.findMany.mockResolvedValue([]); h.campaignMember.findMany.mockResolvedValue([{ userId: "dm", role: "dm" }]); h.character.update.mockImplementation(async ({ data }) => ({ ...data })); });
it("sameCreateHttpAndToolDefaults", async () => {
  h.user.findUnique.mockResolvedValue({ id: "dm" }); h.campaignMember.findFirst.mockResolvedValue({ id: "m" }); h.character.create.mockImplementation(async ({ data }) => ({ id: "hero", ...data }));

  const result = await runCharacterOperation(actor, "create", { name: "Герой", race: "Людина", type: "npc_hero", controlledBy: "", class: "Герой" });

  expect(result.affected).toContainEqual({ domain: "characters", id: "hero", name: "Герой" });
  expect(result.data).toMatchObject({ name: "Герой", level: 1, controlledBy: "dm", skillTreeProgress: {} });
  expect(h.characterInventory.create).toHaveBeenCalledWith({ data: { characterId: "hero", equipped: {}, backpack: [], gold: 0, silver: 0, copper: 0, items: [] } });
});
it("crossCampaignControlledByRejected", async () => { h.user.findUnique.mockResolvedValue({ id: "foreign" }); h.campaignMember.findFirst.mockResolvedValue(null); await expect(runCharacterOperation(actor, "patch", { characterId: "hero", controlledBy: "foreign" })).rejects.toMatchObject({ status: 400 }); expect(h.character.update).not.toHaveBeenCalled(); });
it("deleteAllAlwaysHuman", async () => {
  const def = CHARACTER_ACTIONS.find(d => d.id === "characters.delete-all");

  if (!def || def.effect !== "write") throw Error("write");

  const preview = await def.prepare({ actor, channel: "chat", threadId: null, tokenId: null }, {});

  expect(confirmationFor(def, "auto", preview)).toBe("human");
});
it("notesAndGoalsDoNotOverwriteBiography", async () => { await runCharacterOperation(actor, "notes", { characterId: "hero", notes: "Нотатка" }); expect(h.character.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { notes: "Нотатка" } })); await runCharacterOperation(actor, "goals", { characterId: "hero", goals: [] }); expect(h.character.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { goals: [] } })); });
it("tokenIsGameTokenNotApiSecret", async () => {
  h.characterToken.create.mockResolvedValue({ id: "game", color: "red", label: "Мітка", createdAt: new Date(0) });

  const result = await runCharacterOperation(actor, "tokens.create", { characterId: "hero", color: "red", label: "Мітка" });

  expect(result.data).toMatchObject({ token: { id: "game", label: "Мітка" } }); expect(h.characterToken.create).toHaveBeenCalledWith({ data: { characterId: "hero", color: "red", label: "Мітка", createdBy: "dm" } });
});
it("reviewDraftUsesExistingStatusRules", async () => { await expect(runCharacterOperation(actor, "review", { characterId: "hero", action: "return", note: "Уточни" })).rejects.toMatchObject({ status: 400 }); expect(h.character.update).not.toHaveBeenCalled(); });
it("dmCannotWritePlayerPrivateNotes", async () => { h.character.findUnique.mockResolvedValue({ id: "hero", campaignId: "c", controlledBy: "player" }); await expect(runCharacterOperation(actor, "notes", { characterId: "hero", notes: "x" })).rejects.toMatchObject({ status: 403 }); });
it("revokedDmRejected", async () => { h.campaign.findUnique.mockResolvedValue({ id: "c", members: [] }); await expect(runCharacterOperation(actor, "delete", { characterId: "hero" })).rejects.toMatchObject({ status: 403 }); expect(h.character.deleteMany).not.toHaveBeenCalled(); });
it("getDoesNotExposeCampaignInvite", async () => {
  h.character.findUnique.mockResolvedValue({ id: "hero", campaignId: "c", controlledBy: "dm", notes: "Власні", campaign: { name: "Кампанія", inviteCode: "SECRET", members: [{ userId: "dm", role: "dm" }] } });

  const result = await runCharacterOperation(actor, "get", { characterId: "hero" });

  expect(JSON.stringify(result)).not.toContain("SECRET");
});
it("foreignCharacterRejectedBeforePatch", async () => { h.character.findUnique.mockResolvedValue({ id: "hero", campaignId: "other", controlledBy: "dm" }); await expect(runCharacterOperation(actor, "patch", { characterId: "hero", name: "X" })).rejects.toMatchObject({ status: 403 }); expect(h.character.update).not.toHaveBeenCalled(); });
it("assistantAvatarDoesNotPerformExternalStorageWork", async () => { await expect(runCharacterOperation(actor, "create", { name: "Герой", race: "Людина", type: "npc_hero", controlledBy: "", class: "Герой", avatar: "https://outside.invalid/portrait.png" })).rejects.toMatchObject({ status: 422 }); });
it("httpAvatarPreparationRunsBeforeWriteGuard", async () => {
  const { createCharacter } = await import("@/lib/server/characters/operations/create");

  const { resolveAvatarForPersistence } = await import("@/lib/supabase/avatar-storage");

  const { currentContentWrite } = await import("@/lib/server/content/write-context");

  vi.mocked(resolveAvatarForPersistence).mockImplementation(async (value) => {
    if (value === "https://outside.invalid/portrait.png") expect(currentContentWrite()).toBeUndefined();

    return { ok: true, avatar: "portrait" };
  });
  h.character.create.mockImplementation(async ({ data }) => ({ id: "hero", ...data }));

  const response = await createCharacter(new Request("http://local", { method: "POST", body: JSON.stringify({ name: "Герой", race: "Людина", type: "npc_hero", controlledBy: "", class: "Герой", avatar: "https://outside.invalid/portrait.png" }) }), "c", actor);

  expect(response.status).toBe(200);
});
it("characterCorePreviewTracksContentChanges", async () => {
  const { characterState } = await import("@/lib/server/characters/action-service");

  const { requestDigest } = await import("@/lib/server/assistant/intent-store");

  const before = requestDigest(await characterState(actor, { characterId: "hero" }));

  h.race.findMany.mockResolvedValue([{ id: "race", choices: [{ id: "changed" }] }] as never); expect(requestDigest(await characterState(actor, { characterId: "hero" }))).not.toBe(before);
});

it("httpDmGuardRunsBeforeDatabaseWriteLock", async () => {
  const { NextResponse } = await import("next/server");

  const { requireDM } = await import("@/lib/utils/api/api-auth");

  vi.mocked(requireDM).mockResolvedValue(NextResponse.json({ error: "forbidden" }, { status: 403 }));

  const { createCharacter } = await import("@/lib/server/characters/operations/create");

  const response = await createCharacter(new Request("http://local", { method: "POST", body: "{}" }), "c");

  expect(response.status).toBe(403); expect(h.$queryRaw).not.toHaveBeenCalled();
});
it("deleteAllPreviewNamesOnlyPlayerCharacters",async()=>{
 h.character.findMany.mockResolvedValue([{id:"player",name:"Гравець",type:"player"},{id:"npc",name:"NPC",type:"npc_hero"}]);

 const action=CHARACTER_ACTIONS.find(a=>a.id==="characters.delete-all");

if(!action||action.effect!=="write")throw Error("action");

 const preview=await action.prepare({actor,channel:"chat",threadId:null,tokenId:null},{});

 expect(preview.targets).toEqual([{domain:"characters",id:"player",name:"Гравець"}]);
 expect(JSON.stringify(preview.changes)).not.toContain("NPC");
});
