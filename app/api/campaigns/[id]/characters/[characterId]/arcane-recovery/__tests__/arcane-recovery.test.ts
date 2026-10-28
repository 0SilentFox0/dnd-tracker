import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));

const ability = resolved({ trigger: { event: "passive" }, effects: [{ kind: "restoreSpellSlotLevels", budget: { formula: "ceil(5 / 2)" }, maxSlotLevel: 5 }] }, { type: "class", id: "wizard" });

const participant = (withAbility = true) => {
  const base = createMockParticipant();

  return { ...base, battleData: { ...base.battleData, resolvedAbilities: withAbility ? [ability] : [] } };
};

vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: vi.fn() }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const rules = (persistResources = true) => ({ ...DEFAULT_RULES, classes: { enabled: true }, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources } });

const setup = async (resources: object, opts: { persist?: boolean; withAbility?: boolean } = {}) => {
  const { buildCharacterParticipant } = await import("@/lib/server/characters/participant");

  vi.mocked(buildCharacterParticipant).mockResolvedValue({ participant: participant(opts.withAbility ?? true) } as never);
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: "owner", isDM: false, campaign: { id: "camp", maxLevel: 20, rules: rules(opts.persist ?? true) } },
    character: { id: "ch", campaignId: "camp", resources },
  } as never);
};

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

const open = { shortRestOpen: true, slotsSpent: { "1": 2, "2": 1, "6": 1 } };

describe("POST arcane-recovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restores the picked slots, marks the day and logs", async () => {
    await setup(open);

    const res = await post({ picks: { "1": 1, "2": 1 } });

    expect(res.status).toBe(200);
    expect((await res.json()).resources).toMatchObject({ slotsSpent: { "1": 1, "6": 1 }, charges: { [ability.key]: { used: 1, rest: "long" } } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "arcane_recovery", data: { picks: { "1": 1, "2": 1 }, levels: 3 } })] });
  });

  it.each([
    [{ "1": 2, "2": 1 }, "budget"],
    [{ "6": 1 }, "level 6"],
    [{ "3": 1 }, "not spent"],
  ])("400 for %j (%s)", async (picks, _why) => {
    await setup(open);

    const res = await post({ picks });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.ARCANE_RECOVERY_INVALID);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("409 for a second use before the long rest", async () => {
    await setup({ ...open, charges: { [ability.key]: { used: 1, rest: "long" } } });

    const res = await post({ picks: { "1": 1 } });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(API_ERRORS.ARCANE_RECOVERY_USED);
  });

  it.each([
    [{ slotsSpent: { "1": 1 } }, {}, API_ERRORS.SHORT_REST_CLOSED],
    [open, { withAbility: false }, API_ERRORS.ARCANE_RECOVERY_UNAVAILABLE],
    [{ ...open, dead: true }, {}, API_ERRORS.CHARACTER_DEAD],
    [open, { persist: false }, API_ERRORS.OOC_RESOURCES_DISABLED],
  ])("409 for %j %j", async (resources, opts, error) => {
    await setup(resources, opts);

    const res = await post({ picks: { "1": 1 } });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(error);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });
});
