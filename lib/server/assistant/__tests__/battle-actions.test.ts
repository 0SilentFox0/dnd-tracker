import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isAssistantHandoffHref } from "@/lib/schemas/assistant-handoff";
import { ASSISTANT_ROUTE_COVERAGE, exportedHttpMethods } from "@/lib/server/assistant/__tests__/helpers/coverage";
import { BATTLE_ACTION_COVERAGE } from "@/lib/server/assistant/actions/battle-coverage";
import { BATTLE_ACTIONS } from "@/lib/server/assistant/actions/battles";
import { confirmationFor } from "@/lib/server/assistant/policy";
import type { AssistantCaller, AssistantWriteAction } from "@/lib/server/assistant/types";
import { prepareBattleAction, runBattleAction } from "@/lib/server/battles/action-service";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const fixture = vi.hoisted(() => ({ row: {} as Record<string, unknown>, loaded: {} as Record<string, unknown>, saves: [] as unknown[], rolls: 0, content: {} as Record<string, unknown> }));

vi.mock("@/lib/server/assistant/actions/content-snapshot", () => ({ contentSnapshot: async () => fixture.content }));
vi.mock("@/lib/db", () => ({ prisma: {
  campaignMember: { findUnique: async () => ({ role: "dm" }) },
  campaign: { findUnique: async () => ({ rules: DEFAULT_RULES }) },
  battleScene: { findFirst: async () => fixture.row, findUnique: async () => fixture.row, findMany: async () => [fixture.row] },
  spell: { findUnique: async () => ({ id: "s", campaignId: "c", executionMode: "manual" }), findMany: async () => [] },
  character: { findMany: async () => [] }, unit: { findMany: async () => [] },
} }));
vi.mock("@/lib/server/battles/pipeline-deps", () => ({ defaultPipelineDeps: {
  getUserId: async () => "u", loadBattle: async () => fixture.loaded,
  recheckAccess: async () => ({ isMember: true, isDM: true }),
  rateLimit: async () => ({ allowed: true }), loadRecentEvents: async () => [],
  saveBattle: async (_before: unknown, outcome: unknown) => { fixture.saves.push(outcome);

 return { version: 4, events: [], upserted: [], fullIds: [], removed: [] }; },
  publish: () => {}, rng: () => { fixture.rolls++;

 return 0.5; },
}, defaultReadDeps: {} }));
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, callback: () => unknown) => callback() }));

const caller: AssistantCaller = { actor: { campaignId: "c", userId: "u", isDM: true, via: "session", scopes: null }, channel: "chat", threadId: null, tokenId: null };

const action = (name: string) => BATTLE_ACTIONS.find(a => a.id === `battles.${name}`) as AssistantWriteAction;

const input = { battleId: "b", body: {} };

beforeEach(() => {
  const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", controlledBy: "u" } });

  hero.battleData.attacks = [{ id: "sword", name: "Sword", type: "melee", damageDice: "1d6", attackBonus: 2, damageType: "slashing" }];

  const enemy = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: "enemy", side: "enemy" } });

  fixture.row = { id: "b", campaignId: "c", name: "Battle", version: 3, participants: [], map: null, audio: null };
  fixture.loaded = { scene: { id: "b", campaignId: "c", status: "active", round: 1, turnIndex: 0, version: 3, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null }, meta: { name: "Battle", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, map: null, createdAt: new Date(0) }, participants: [hero, enemy], pending: [], isMember: true, isDM: true };
  fixture.saves = []; fixture.rolls = 0; fixture.content = {};
});

describe("T11 battle adapters", () => {
  it("ledgerEveryBattleEndpointCovered", () => {
    const expected = ASSISTANT_ROUTE_COVERAGE.filter(row => row.adapter === "battles").flatMap(row => row.methods.map(method => `${method} ${row.route}`)).sort();

    expect(BATTLE_ACTION_COVERAGE.map(row => `${row.method} ${row.route}`).sort()).toEqual(expected);
    for (const row of BATTLE_ACTION_COVERAGE) {
      expect(exportedHttpMethods(readFileSync(`app/api/${row.route}/route.ts`, "utf8"))).toContain(row.method);
      expect(BATTLE_ACTIONS.find(action => action.id === row.actionId), row.actionId).toBeDefined();
    }

    const names = ["list", "active", "get", "version", "summary", "events", "balance.get", "balance", "create", "patch", "delete", "clear-history", "audio.get", "audio", "start", "complete", "reset", "rollback", "add-participant", "participants.patch", "reveal-participant", "unit-control", "refresh-sources", "scale-units", "next-turn", "attack", "spell", "bonus-action", "core-action", "ability-action", "aura-zone", "conditions", "morale-check", "move", "map-terrain", "map-weather", "maze", "maze-mark"];

    for (const name of names) expect(BATTLE_ACTIONS.find(a => a.id === `battles.${name}`), name).toBeDefined();
  });
  it("startCompleteAndResetPolicy", () => {
    expect(action("start").confirmation).toBe("standard"); expect(action("complete").confirmation).toBe("standard");
    for (const name of ["delete", "clear-history", "reset", "rollback"]) expect(action(name).confirmation).toBe("always");
  });
  it("attackRepeatKeepsSameRollAndEvent: preview never rolls or spends", async () => {
    const preview = await prepareBattleAction(caller, "attack", { battleId: "b", body: { attackerId: "hero", targetId: "enemy" }, dice: "server" });

    expect(fixture.rolls).toBe(0); expect(fixture.saves).toEqual([]);
    expect(preview.changes[0].after).toMatchObject({ dice: "server" });
    expect(preview.preconditions).toHaveProperty("version", 3);
  });
  it("illegalReachAndManualSpellFailBeforeSpend", async () => {
    await expect(prepareBattleAction(caller, "attack", { battleId: "b", body: { attackerId: "hero", targetId: "missing" } })).rejects.toMatchObject({ status: 404 });
    await expect(prepareBattleAction(caller, "spell", { battleId: "b", body: { casterId: "hero", spellId: "s" } })).rejects.toMatchObject({ status: 422 });

    const participants = fixture.loaded.participants as BattleParticipant[];

    participants[0].battleData.position = { x: 1, y: 1 };
    participants[1].battleData.position = { x: 8, y: 8 };
    (fixture.loaded.meta as Record<string, unknown>).map = { cols: 10, rows: 10, background: null, opacity: 1 };
    await expect(prepareBattleAction(caller, "attack", { battleId: "b", body: { attackerId: "hero", targetId: "enemy" } })).rejects.toMatchObject({ status: 422 });
    expect(fixture.rolls).toBe(0); expect(fixture.saves).toEqual([]);
  });
  it("targetAndTurnChangeStale", async () => {
    const before = await prepareBattleAction(caller, "next-turn", input);

    (fixture.loaded.scene as Record<string, unknown>).turnIndex = 1;
    await expect(runBattleAction(caller.actor, "next-turn", input, before.preconditions)).rejects.toMatchObject({ status: 409 });
    expect(fixture.saves).toEqual([]);
  });
  it("mapWeatherMazeAndReserveUseSameGuards", async () => {
    fixture.loaded.isDM = false;
    for (const operation of ["map-weather", "maze", "add-participant"]) {
      await expect(prepareBattleAction(caller, operation, input)).rejects.toMatchObject({ status: 403 });
    }
    expect(fixture.saves).toEqual([]);
  });
  it("rollbackHumanOnly", () => {
    expect(action("rollback").confirmation).toBe("always");
    expect(action("rollback").need).toMatchObject({ access: "dm", scope: "battles:write" });
  });
  it("server attack records server dice and rolls only one base damage set", async () => {
    const preview = await prepareBattleAction(caller, "attack", { battleId: "b", body: { attackerId: "hero", targetId: "enemy" } });

    await runBattleAction(caller.actor, "attack", { battleId: "b", body: { attackerId: "hero", targetId: "enemy" } }, preview.preconditions);

    const outcome = fixture.saves[0] as { events: Array<{ details: Record<string, unknown> }> };

    const groups = (outcome.events[0].details.actionDetails as { diceRolls: Array<{ kind: string; dice: Array<{ sides: number; value: number; server?: boolean }> }> }).diceRolls;

    expect(groups.find(g => g.kind === "attack")?.dice[0]).toMatchObject({ server: true, value: 11 });
    expect(groups.find(g => g.kind === "damage")?.dice).toHaveLength(2); // weapon + HOMM hero die
  });
  it("reference edits stale", async () => {
    const preview = await prepareBattleAction(caller, "attack", { battleId: "b", body: { attackerId: "hero", targetId: "enemy" } });

    fixture.content = { artifacts: ["changed"] };
    await expect(runBattleAction(caller.actor, "attack", { battleId: "b", body: { attackerId: "hero", targetId: "enemy" } }, preview.preconditions)).rejects.toMatchObject({ status: 409 });
  });
  it("foreign setup refs rejected", async () => {
    await expect(prepareBattleAction(caller, "create", { body: { name: "New", participants: [{ id: "foreign", type: "character", side: "ally" }] } })).rejects.toMatchObject({ status: 404 });
  });
  it.each([
    { input: {}, href: "/campaigns/c/dm/battles" },
    { input: { battleId: "battle-1" }, href: "/campaigns/c/dm/battles/battle-1" },
  ])("map-background opens the allowed map editor at $href without a write", async ({ input, href }) => {
    const handoff = BATTLE_ACTIONS.find(a => a.id === "battles.map-background");

    if (!handoff || handoff.effect !== "handoff") throw new Error("Missing map handoff");

    const result = await handoff.execute(caller, input);

    expect(result.href).toBe(href);
    expect(isAssistantHandoffHref(result.href)).toBe(true);
    expect(fixture.rolls).toBe(0);
    expect(fixture.saves).toEqual([]);
  });
  it("external backgrounds use existing UI", async () => {
    await expect(prepareBattleAction(caller, "patch", { battleId: "b", body: { map: { cols: 10, rows: 10, opacity: 1, background: "https://external.example/map.png" } } })).rejects.toMatchObject({ status: 400 });
    expect(fixture.rolls).toBe(0); expect(fixture.saves).toEqual([]);
  });
  it("morale server dice are deferred; invented d10 is rejected", async () => {
    await prepareBattleAction(caller, "morale-check", { battleId: "b", body: { participantId: "hero" } });
    expect(fixture.rolls).toBe(0);
    await expect(prepareBattleAction(caller, "morale-check", { battleId: "b", body: { participantId: "hero", d10Roll: 10 } })).rejects.toMatchObject({ status: 400 });
  });
  it("participant removal and control changes always need human confirmation", async () => {
    for (const [operation, body] of [["participants.patch", { participantId: "hero", removeFromBattle: true }], ["unit-control", { mode: "random" }]] as const) {
      const preview = await prepareBattleAction(caller, operation, { battleId: "b", body });

      expect(confirmationFor(action(operation), "auto", preview)).toBe("human");
    }
  });
  it("maze generation and whole preparation replacement cannot erase progress in auto", async () => {
    for (const [operation, body] of [["patch", { participants: [] }], ["maze", { op: "generate", difficulty: "easy", teleportPairs: 0, fogPatches: 0, exit: null }]] as const) {
      const preview = await prepareBattleAction(caller, operation, { battleId: "b", body });

      expect(confirmationFor(action(operation), "auto", preview)).toBe("human");
    }
  });
  it("unsolicited rolls fail closed; manual mode is visible", async () => {
    await expect(prepareBattleAction(caller, "attack", { battleId: "b", body: { attackerId: "hero", targetId: "enemy", d20Roll: 20 } })).rejects.toMatchObject({ status: 400 });

    const preview = await prepareBattleAction(caller, "attack", { battleId: "b", dice: "manual", body: { attackerId: "hero", targetId: "enemy", d20Roll: 12 } });

    expect(preview.changes[0].after).toMatchObject({ dice: "manual", body: { d20Roll: 12 } });
  });
});
