import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { refs, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => refs) }));
vi.mock("@/lib/db", () => {
  const prisma = {
    character: { findUnique: vi.fn(), update: vi.fn(async ({ data }: { data: object }) => ({ id: "ch", ...data })) },
    characterLog: { createMany: vi.fn() },
    battleParticipant: { findFirst: vi.fn(async () => null) },
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(),
  };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const row = { id: "ch", campaignId: "camp", controlledBy: "player", status: "active", race: "Elf", level: 4, skills: {}, raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 4 }], ...scores };

const gate = ({ isDM = true, allowPlayerEdit = true, character = row } = {}) => {
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: isDM ? "dm" : "player", isDM, campaign: { id: "camp", maxLevel: 20, allowPlayerEdit, rules: { ...DEFAULT_RULES, classes: { enabled: true } } } },
    character,
  } as never);
  vi.mocked(prisma.character.findUnique).mockResolvedValue(character as never);
};

const put = async (body: object) => {
  const { PUT } = await import("../route");

  return PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PUT choices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DM saves the lineage: subrace, JSON columns and a choices_edit log entry", async () => {
    gate();

    const res = await put({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] } });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toMatchObject({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] }, subrace: "Wood Elf" });
    expect(vi.mocked(prisma.characterLog.createMany).mock.calls[0][0]).toMatchObject({ data: [{ kind: "choices_edit", actorUserId: "dm", characterId: "ch" }] });
  });

  it("owner needs allowPlayerEdit; a pending draft goes through the draft route", async () => {
    gate({ isDM: false, allowPlayerEdit: false });

    expect((await put({ raceChoices: {} })).status).toBe(403);

    gate({ isDM: false, character: { ...row, status: "pending" } });

    expect((await put({ raceChoices: {} })).status).toBe(403);

    gate({ isDM: false });

    expect((await put({ raceChoices: { "elven-lineage": [{ id: "drow" }] } })).status).toBe(200);
  });

  it("409 while the hero is in an active battle", async () => {
    gate();
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValueOnce({ id: "p" } as never);

    expect((await put({ raceChoices: {} })).status).toBe(409);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("class picks merge into the stored entries; ASI writes the score", async () => {
    gate();

    await put({ classChoices: { [sorcerer.id]: { "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "charisma" }, { id: "wisdom" }] } }] } } });

    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toMatchObject({ charisma: 18, wisdom: 13, classes: [{ classId: sorcerer.id, level: 4, choices: { "ability-score-improvement-4": [{ id: "f-asi" }] } }] });
  });

  it("422 with issues; non-DM cannot touch DM feats; empty body is 400", async () => {
    gate();

    const bad = await put({ classChoices: { [sorcerer.id]: { metamagic: [{ id: "ghost" }] } } });

    expect(bad.status).toBe(422);
    expect((await bad.json()).issues[0]).toMatchObject({ code: "CHOICE_UNKNOWN" });

    gate({ isDM: false });

    expect((await put({ feats: [{ id: "f-archery", source: "dm" }] })).status).toBe(403);
    expect((await put({})).status).toBe(400);
  });
});
