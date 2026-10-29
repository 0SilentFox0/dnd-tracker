import { beforeEach, expect, it, vi } from "vitest";

import { CHARACTER_PROGRESSION_ACTIONS } from "@/lib/server/assistant/actions/character-progression";
import { requestDigest } from "@/lib/server/assistant/json";
import { confirmationFor } from "@/lib/server/assistant/policy";
import { progressionState, runCharacterProgression } from "@/lib/server/characters/progression-service";
import { parseRules } from "@/lib/utils/rules/schema";

const h = vi.hoisted(() => ({ campaign: { findUnique: vi.fn() }, character: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() }, battleParticipant: { findFirst: vi.fn() }, race: { findMany: vi.fn(async () => []) }, gameClass: { findMany: vi.fn(async () => []) }, background: { findMany: vi.fn(async () => []) }, feat: { findMany: vi.fn(async () => []) }, spell: { findMany: vi.fn(async () => []) }, skill: { findMany: vi.fn(async () => []) }, mainSkill: { findMany: vi.fn(async () => []) }, skillTree: { findMany: vi.fn(async () => []) }, artifactSet: { findMany: vi.fn(async () => []) }, spellGroup: { findMany: vi.fn(async () => []) }, artifact: { findMany: vi.fn(async () => []) }, characterInventory: { findUnique: vi.fn(async()=>({equipped:{},stash:[]})), upsert:vi.fn(async()=>({equipped:{weapon:"foreign"}})),findMany: vi.fn(async () => []) }, $executeRaw:vi.fn(async()=>1),$queryRaw: vi.fn(async () => [{ id: "c" }]) }));

vi.mock("@/lib/db", () => ({ prisma: { ...h, $transaction: (fn: (db: typeof h) => unknown) => fn(h) } }));

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const hero = { id: "hero", campaignId: "c", name: "Герой", level: 1, controlledBy: "dm", classes: [], resources: {}, inventory: { gold: 10, items: [{ name: "Річ", quantity: 1 }] }, background: "Життєпис" };

beforeEach(() => { vi.clearAllMocks(); h.campaign.findUnique.mockResolvedValue({ id: "c", kind: "campaign", maxLevel: 20, allowPlayerEdit: true, rules: parseRules(null), members: [{ userId: "dm", role: "dm" }] }); h.character.findMany.mockResolvedValue([hero]); h.character.findUnique.mockResolvedValue(hero); h.battleParticipant.findFirst.mockResolvedValue(null); });
it("choicesPreviewThenLevelChangeStale", async () => {
  const expected = requestDigest(await progressionState(actor, { characterId: "hero" }));

  h.character.findMany.mockResolvedValue([{ ...hero, level: 2 }]); await expect(runCharacterProgression(actor, "choices", { characterId: "hero", raceChoices: {} }, expected)).rejects.toMatchObject({ status: 409 }); expect(h.character.update).not.toHaveBeenCalled();
});
it("activeBattle409", async () => { h.battleParticipant.findFirst.mockResolvedValue({ id: "participant" }); await expect(runCharacterProgression(actor, "choices", { characterId: "hero", raceChoices: {} })).rejects.toMatchObject({ status: 409 }); expect(h.character.update).not.toHaveBeenCalled(); });
it("backgroundGearGoldUntouched", async () => {
  const action = CHARACTER_PROGRESSION_ACTIONS.find(a => a.id === "characters.choices");

  if (!action || action.effect !== "write") throw Error("action");

  const preview = await action.prepare({ actor, channel: "chat", threadId: null, tokenId: null, locale: "uk" as const }, { characterId: "hero", raceChoices: {} });

  expect(h.character.update).not.toHaveBeenCalled(); expect(JSON.stringify(preview)).toContain("Життєпис"); expect(h.characterInventory.findMany).not.toHaveBeenCalled(); expect(preview.warnings.join(" ")).toContain("assistant.warnings.characterManual");
});
it("additionalSpellsStillUnsupported", () => {
  const action = CHARACTER_PROGRESSION_ACTIONS.find(a => a.id === "characters.choices");

  expect(action?.input.safeParse({ characterId: "hero", raceChoices: {}, additionalSpells: ["spell"] }).success).toBe(false);
});
it("resetProgressAlwaysHuman", async () => {
  const action = CHARACTER_PROGRESSION_ACTIONS.find(a => a.id === "characters.progression.reset");

  if (!action || action.effect !== "write") throw Error("action");

  const preview = await action.prepare({ actor, channel: "chat", threadId: null, tokenId: null, locale: "uk" as const }, { characterId: "hero" });

  expect(confirmationFor(action, "auto", preview)).toBe("human");
});
it("explicitDmRollOrServerFormulaNoInventedRoll", () => {
  const action = CHARACTER_PROGRESSION_ACTIONS.find(a => a.id === "characters.roll");

  expect(action?.input.safeParse({ characterId: "hero", kind: "check", ability: "strength" }).success).toBe(false); expect(action?.input.safeParse({ characterId: "hero", mode: "server", kind: "check", ability: "strength" }).success).toBe(true); expect(action?.input.safeParse({ characterId: "hero", mode: "server", kind: "check", ability: "strength", roll: 20 }).success).toBe(false);
});
it("changedContentRefsMakeChoicesStale", async () => {
  const expected = requestDigest(await progressionState(actor, { characterId: "hero" }));

  h.race.findMany.mockResolvedValue([{ id: "race", choices: [{ id: "new" }] }] as never); await expect(runCharacterProgression(actor, "choices", { characterId: "hero", raceChoices: {} }, expected)).rejects.toMatchObject({ status: 409 });
});
it("transferSnapshotIncludesBothBeforeStates", async () => { h.character.findMany.mockResolvedValue([{ ...hero, id: "a" }, { ...hero, id: "z" }]); await progressionState(actor, { characterId: "z", toCharacterId: "a" }); expect(h.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "c", id: { in: ["a", "z"] } } })); });
it("refsReadInsideGuardBypassReferenceCache", async () => {
  const { getCachedClasses } = await import("@/lib/cache/reference-data");

  const { runContentWriteContext } = await import("@/lib/server/content/write-context");

  const rows = await runContentWriteContext("c", h, () => getCachedClasses("c"));

  expect(rows).toEqual([]);
});
it("foreignNestedHeroCannotBePrepared", async () => { h.character.findMany.mockResolvedValue([]); await expect(progressionState(actor, { characterId: "foreign" })).rejects.toMatchObject({ status: 404 }); });
it("artifactSetChangesAlsoMakeProgressStale", async () => {
  const expected = requestDigest(await progressionState(actor, { characterId: "hero" }));

  h.$queryRaw.mockResolvedValue([{ id: "c", digest: "changed" }] as never); await expect(runCharacterProgression(actor, "choices", { characterId: "hero", raceChoices: {} }, expected)).rejects.toMatchObject({ status: 409 });
});
it("inventoryReadDoesNotCreateMissingInventory", async () => {
  h.character.findUnique.mockResolvedValue({ ...hero, inventory: null, campaign: { members: [{ userId: "dm", role: "dm" }] } });

  const result = await runCharacterProgression(actor, "inventory", { characterId: "hero" });

  expect(result.data).toMatchObject({ characterId: "hero", gold: 0, items: [] }); expect(h.character.update).not.toHaveBeenCalled();
});

it("foreignInventoryRefRejectedBeforeWrite",async()=>{ await expect(runCharacterProgression(actor,"inventory.patch",{characterId:"hero",equipped:{weapon:"foreign"}})).rejects.toMatchObject({status:404});expect(h.characterInventory.upsert).not.toHaveBeenCalled(); });
it("progressionStateReadsOnlyRequestedHeroes", async () => {
  await progressionState(actor, { characterId: "hero" });

  expect(h.character.findMany).toHaveBeenCalledTimes(1);
  expect(h.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "c", id: { in: ["hero"] } } }));
  expect(h.characterInventory.findMany).not.toHaveBeenCalled();
  expect(h.campaign.findUnique).toHaveBeenCalledTimes(2);
});
