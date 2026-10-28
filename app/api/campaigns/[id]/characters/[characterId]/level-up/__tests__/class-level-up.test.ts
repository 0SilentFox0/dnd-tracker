import { API_ERRORS } from "@/lib/constants/api-errors";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/cache/reference-data", () => ({
  getCachedClasses: vi.fn(async () => [
    { id: "c1", name: "Воїн", hitDie: 10, caster: "none", savingThrows: [], proficiencies: {}, skillChoices: {}, features: [], subclasses: [{ id: "s1", name: "Чемпіон", features: [] }, { id: "s2", name: "Майстер", features: [] }], subclassLevel: 3 },
    { id: "c3", name: "Бард", hitDie: 8, caster: "none", savingThrows: [], proficiencies: {}, skillChoices: {}, features: [], subclasses: [], subclassLevel: 3 },
    { id: "c2", name: "Маг", hitDie: 6, caster: "full", savingThrows: [], proficiencies: {}, skillChoices: {}, features: [], subclasses: [], subclassLevel: null },
  ]),
}));
vi.mock("@/lib/server/characters/core/load-race-progression", () => ({ loadRaceProgression: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => {
  const prisma: Record<string, unknown> = { $queryRaw: vi.fn(async () => []), character: { findUnique: vi.fn(), update: vi.fn() } };

  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const campaign = { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, classes: { enabled: true } } };

const post = async (body?: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: body ? JSON.stringify(body) : undefined }), {
    params: Promise.resolve({ id: "camp", characterId: "ch" }),
  }) as Promise<NextResponse>;
};

const base = { id: "ch", campaignId: "camp", level: 2, seenLevel: 2, race: "Люди", spellSlots: {}, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, spellcastingAbility: null };

describe("POST level-up (classes)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign } as never);
    vi.mocked(prisma.character.update).mockImplementation((async (args: { data: object }) => ({ id: "ch", ...args.data })) as never);
  });

  const withClasses = (classes: object[], level = 2) => vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...base, level, classes } as never);

  const written = () => vi.mocked(prisma.character.update).mock.calls[0][0].data as Record<string, unknown>;

  it("клас-шлях: характеристики не змінюються", async () => {
    withClasses([{ classId: "c1", level: 1 }], 1);

    const res = await post({ classId: "c1" });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(written()).toMatchObject({ level: 2, classes: [{ classId: "c1", level: 2 }] });
    expect(written()).not.toHaveProperty("strength");
    expect(json.levelUpDetails).toEqual({ abilityIncreased: null, classId: "c1" });
  });

  it("мультиклас: новий клас додається", async () => {
    withClasses([{ classId: "c1", level: 2 }]);

    await post({ classId: "c2" });

    expect(written()).toMatchObject({ level: 3, classes: [{ classId: "c1", level: 2 }, { classId: "c2", level: 1 }] });
  });

  it("SUBCLASS_REQUIRED на рівні subclassLevel", async () => {
    withClasses([{ classId: "c1", level: 2 }]);

    const res = await post({ classId: "c1" });

    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(API_ERRORS.SUBCLASS_REQUIRED);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("підклас у тілі приймається", async () => {
    withClasses([{ classId: "c1", level: 2 }]);

    const res = await post({ classId: "c1", subclassId: "s1" });

    expect(res.status).toBe(200);
    expect(written()).toMatchObject({ subclass: "Чемпіон" });
  });

  it("CLASS_REQUIRED без classId", async () => {
    withClasses([{ classId: "c1", level: 2 }]);

    const res = await post();

    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(API_ERRORS.CLASS_REQUIRED);
  });

  it("HOMM-шлях: без класів і без тіла — як раніше", async () => {
    withClasses([]);

    const res = await post();

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(written().level).toBe(3);
    expect(json.levelUpDetails).toHaveProperty("spellSlots");
    expect(written()).not.toHaveProperty("classes");
  });

  it("порожні classes + classId — 422 «Спершу переведіть»", async () => {
    withClasses([]);

    const res = await post({ classId: "c1" });

    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(API_ERRORS.CONVERT_TO_CLASSES_FIRST);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("клас без підкласів на subclassLevel не вимагає підклас", async () => {
    withClasses([{ classId: "c3", level: 2 }]);

    const res = await post({ classId: "c3" });

    expect(res.status).toBe(200);
  });

  it("зміна наявного підкласу при підвищенні — 422", async () => {
    withClasses([{ classId: "c1", level: 3, subclassId: "s1" }], 3);

    const res = await post({ classId: "c1", subclassId: "s2" });

    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("Підклас уже обрано");
  });
});

// Shared transaction SQL is exercised by character storage integration; retain the existing business DB doubles.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
