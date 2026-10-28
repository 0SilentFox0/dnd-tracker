import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CHARACTER_INPUTS, runCharacterOperation } from "@/lib/server/characters/action-service";
import { PUT as choices } from "@/lib/server/characters/operations/choices";
import { POST as experience } from "@/lib/server/characters/operations/experience";
import { CHARACTER_OPERATIONS } from "@/lib/server/characters/operations/registry";
import { POST as roll } from "@/lib/server/characters/operations/roll";
import { PROGRESSION_INPUTS, runCharacterProgression } from "@/lib/server/characters/progression-service";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const h = vi.hoisted(() => ({
  campaign: { findUnique: vi.fn() },
  character: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  characterLog: { createMany: vi.fn() },
  battleParticipant: { findFirst: vi.fn() },
  $queryRaw: vi.fn(),
  access: vi.fn(),
  choices: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { ...h, $transaction: (fn: (db: typeof h) => unknown) => fn(h) } }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: h.access, requireDM: h.access }));
vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: vi.fn(async () => ({ participant: createMockParticipant(), context: {} })) }));
vi.mock("@/lib/server/characters/core/choices-handler", () => ({ saveCharacterChoices: h.choices }));

const rules = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, xp: true } };

const hero = { id: "hero", campaignId: "camp", controlledBy: "dm", resources: {}, classes: [], experience: 0, inventory: null };

const campaign = { id: "camp", kind: "campaign", maxLevel: 20, allowPlayerEdit: true, rules, members: [{ userId: "dm", role: "dm" }] };

const access = { userId: "dm", isDM: true, campaign };

const actor = { campaignId: "camp", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const route = { params: Promise.resolve({ id: "camp", characterId: "hero" }) };

const post = (body: object) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  h.access.mockResolvedValue(access);
  h.campaign.findUnique.mockResolvedValue(campaign);
  h.character.findUnique.mockResolvedValue(hero);
  h.character.findMany.mockResolvedValue([{ id: "hero", experience: 0 }]);
  h.battleParticipant.findFirst.mockResolvedValue(null);
  h.$queryRaw.mockResolvedValue([{ id: "camp" }]);
  h.choices.mockResolvedValue({ id: "hero", raceChoices: {} });
});

afterEach(() => vi.restoreAllMocks());

describe("gate runs once per HTTP request", () => {
  it.each([
    ["roll", () => import("@/lib/server/characters/operations/roll").then(m => m.POST), { kind: "check", skill: "stealth" }],
    ["hit-dice", () => import("@/lib/server/characters/operations/hit-dice").then(m => m.POST), { classId: "c" }],
    ["resources", () => import("@/lib/server/characters/operations/resources").then(m => m.PATCH), { hp: 3 }],
  ])("%s: one access check, one character read, no request clone", async (_name, load, body) => {
    const clone = vi.spyOn(Request.prototype, "clone");

    const handler = await load();

    await handler(post(body), route);

    expect(h.access).toHaveBeenCalledTimes(1);
    expect(h.character.findUnique).toHaveBeenCalledTimes(1);
    expect(clone).not.toHaveBeenCalled();
  });

  it("notes: one access check, one character read, no request clone", async () => {
    h.character.update.mockResolvedValue({ notes: "x" });

    const clone = vi.spyOn(Request.prototype, "clone");

    const { PUT } = await import("@/lib/server/characters/operations/notes");

    const res = await PUT(post({ notes: "x" }), route);

    expect(res.status).toBe(200);
    expect(h.access).toHaveBeenCalledTimes(1);
    expect(h.character.findUnique).toHaveBeenCalledTimes(1);
    expect(clone).not.toHaveBeenCalled();
  });

  it("invalid body is rejected after the gate, before any lock", async () => {
    const { POST } = await import("@/lib/server/characters/operations/roll");

    const res = await POST(post({ kind: "nope" }), route);

    expect(res.status).toBe(400);
    expect(h.$queryRaw).not.toHaveBeenCalled();
  });
});

describe("assistant path returns the HTTP data", () => {
  const http = async (handler: (r: Request, c: typeof route, a?: typeof actor) => Promise<Response>, body: object) => {
    const res = await handler(post(body), route, actor);

    expect(res.status).toBe(200);

    return res.json();
  };

  it("roll", async () => {
    const body = { kind: "check", skill: "stealth" };

    expect((await runCharacterProgression(actor, "roll", { characterId: "hero", mode: "server", ...body })).data).toEqual(await http(roll, body));
  });

  it("experience", async () => {
    const body = { characterIds: ["hero"], amount: 50, split: false };

    const viaHttp = await http(experience, body);

    expect((await runCharacterProgression(actor, "experience", body)).data).toEqual(viaHttp);
    expect(viaHttp).toEqual({ characters: [{ id: "hero", experience: 50 }] });
  });

  it("choices", async () => {
    const body = { raceChoices: {} };

    expect((await runCharacterProgression(actor, "choices", { characterId: "hero", ...body })).data).toEqual(await http(choices, body));
  });

  it("notes", async () => {
    h.character.update.mockResolvedValue({ notes: "x" });

    const { PUT } = await import("@/lib/server/characters/operations/notes");

    expect((await runCharacterOperation(actor, "notes", { characterId: "hero", notes: "x" })).data).toEqual(await http(PUT, { notes: "x" }));
  });

  it("list", async () => {
    h.character.findMany.mockResolvedValue([{ id: "hero", name: "Hero" }]);

    const { listCharacters } = await import("@/lib/server/characters/operations/list");

    const viaHttp = await (await listCharacters(new Request("http://x/api?compact=1"), "camp", actor)).json();

    expect((await runCharacterOperation(actor, "list", { compact: true })).data).toEqual(viaHttp);
  });

  it("every registered operation is reachable by name", () => {
    const names = [...Object.keys(CHARACTER_INPUTS), ...Object.keys(PROGRESSION_INPUTS)];

    expect(names.filter(name => !CHARACTER_OPERATIONS[name])).toEqual([]);
  });
});
