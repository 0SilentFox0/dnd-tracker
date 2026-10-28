import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { classLevelUp } from "@/lib/server/characters/class-level-up";
import { refs, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, classes: { enabled: true } } } })) }));
vi.mock("@/lib/server/characters/class-level-up", async (importOriginal) => ({ ...(await importOriginal<object>()), classLevelUp: vi.fn() }));
vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => refs) }));
vi.mock("@/lib/server/characters/core/load-race-progression", () => ({ loadRaceProgression: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => {
  const prisma: Record<string, unknown> = {
    $queryRaw: vi.fn(async () => []),
    character: { findUnique: vi.fn(), update: vi.fn(async ({ data }: { data: object }) => ({ id: "ch", ...data })) },
    characterLog: { createMany: vi.fn() },
    battleParticipant: { findFirst: vi.fn(async () => null) },
  };

  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const stored = { id: "ch", campaignId: "camp", level: 3, seenLevel: 3, race: "Elf", skills: {}, spellSlots: {}, spellcastingAbility: null, raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 3, choices: { metamagic: [{ id: "quickened" }] } }], ...scores };

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("level-up with choices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue(stored as never);
    vi.mocked(classLevelUp).mockResolvedValue({ classes: [{ classId: sorcerer.id, level: 4, choices: { metamagic: [{ id: "quickened" }] } }], level: 4, class: "Sorcerer", subclass: null, spellSlots: {} });
  });

  it("merges the new picks into the raised class, writes ASI and a log entry", async () => {
    const res = await post({ classId: sorcerer.id, choices: { "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "charisma" }, { id: "charisma" }] } }] } });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toMatchObject({
      level: 4,
      charisma: 19,
      classes: [{ classId: sorcerer.id, level: 4, choices: { metamagic: [{ id: "quickened" }], "ability-score-improvement-4": [{ id: "f-asi" }] } }],
    });
    expect(prisma.characterLog.createMany).toHaveBeenCalled();
  });

  it("without choices nothing new happens; with choices the battle lock applies", async () => {
    await post({ classId: sorcerer.id });

    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).not.toHaveProperty("charisma");
    expect(prisma.characterLog.createMany).not.toHaveBeenCalled();
    expect(prisma.battleParticipant.findFirst).not.toHaveBeenCalled();

    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValueOnce({ id: "p" } as never);

    expect((await post({ classId: sorcerer.id, choices: { metamagic: [{ id: "quickened" }, { id: "twinned" }] } })).status).toBe(409);
  });

  it("422 when a pick is invalid", async () => {
    expect((await post({ classId: sorcerer.id, choices: { metamagic: [{ id: "ghost" }] } })).status).toBe(422);
  });

  it("takes classes from the row re-read under the lock, not from the stale first read", async () => {
    const freshClasses = [{ classId: sorcerer.id, level: 3, choices: { metamagic: [{ id: "twinned" }] } }];

    vi.mocked(prisma.character.findUnique).mockResolvedValueOnce(stored as never).mockResolvedValueOnce({ ...stored, classes: freshClasses } as never);

    await post({ classId: sorcerer.id });

    expect(vi.mocked(classLevelUp).mock.calls.at(-1)?.[0].character).toMatchObject({ classes: freshClasses });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });
});

// Shared transaction SQL is exercised by character storage integration; retain the existing business DB doubles.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
