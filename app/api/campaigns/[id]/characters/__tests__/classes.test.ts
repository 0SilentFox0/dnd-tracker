import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/lib/cache/reference-data", () => ({
  getCachedClasses: vi.fn(async () => [
    { id: "c1", name: "Воїн", hitDie: 10, caster: "none", savingThrows: [], proficiencies: {}, skillChoices: {}, features: [], subclasses: [], subclassLevel: null },
  ]),
}));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async () => ({ ok: true, avatar: undefined })) }));
vi.mock("@/lib/db", () => {
  const prisma: Record<string, unknown> = { $queryRaw: vi.fn(async () => []), character: { findUnique: vi.fn(), update: vi.fn() }, race: { findFirst: vi.fn(async () => null) } };

  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const campaign = (classesEnabled: boolean) => ({ id: "camp", maxLevel: 20, allowPlayerEdit: true, rules: { ...DEFAULT_RULES, classes: { enabled: classesEnabled } } });

const patch = async (body: object) => {
  const { patchCharacter } = await import("@/app/api/campaigns/[id]/characters/[characterId]/patch-character");

  return patchCharacter(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), "camp", "ch") as Promise<NextResponse>;
};

const written = () => vi.mocked(prisma.character.update).mock.calls[0][0].data as Record<string, unknown>;

const baseCharacter = {
  id: "ch",
  campaignId: "camp",
  controlledBy: "owner",
  level: 1,
  race: "Люди",
  spellSlots: {},
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

describe("PATCH character classes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue(baseCharacter as never);
    vi.mocked(prisma.character.update).mockImplementation((async (args: { data: object }) => ({ id: "ch", ...args.data })) as never);
  });

  it("гравець-власник: classes ігноруються", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "owner", isDM: false, campaign: campaign(true) } as never);

    const res = await patch({ classes: [{ classId: "c1", level: 5 }], name: "Нове" });

    expect(res.status).toBe(200);
    expect(written().classes).toBeUndefined();
    expect(written().class).toBeUndefined();
    expect(written().level).toBe(1);
  });

  it("ДМ: записує classes і похідні поля, level з тіла ігнорується", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true, campaign: campaign(true) } as never);

    const res = await patch({ classes: [{ classId: "c1", level: 3 }], level: 9 });

    expect(res.status).toBe(200);
    expect(written()).toMatchObject({ classes: [{ classId: "c1", level: 3 }], level: 3, class: "Воїн 3", spellSlots: {} });
  });

  it("класи вимкнені — 422", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true, campaign: campaign(false) } as never);

    expect((await patch({ classes: [{ classId: "c1", level: 3 }] })).status).toBe(422);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("порожні classes: пишеться лише classes", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true, campaign: campaign(false) } as never);

    await patch({ classes: [] });

    expect(written()).toMatchObject({ classes: [], level: 1 });
    expect(written().class).toBeUndefined();
  });

  it("ДМ: зміна рівня через classes не чіпає характеристики й дерево вмінь", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true, campaign: campaign(true) } as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...baseCharacter, level: 2, seenLevel: null, classes: [{ classId: "c1", level: 2 }] } as never);

    await patch({ classes: [{ classId: "c1", level: 4 }] });

    expect(written()).toMatchObject({ level: 4, seenLevel: 2 });
    expect(written()).not.toHaveProperty("strength");
    expect(written()).not.toHaveProperty("skillTreeProgress");

    vi.mocked(prisma.character.update).mockClear();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...baseCharacter, level: 8, seenLevel: 8, classes: [{ classId: "c1", level: 8 }] } as never);

    await patch({ classes: [{ classId: "c1", level: 1 }] });

    expect(written().level).toBe(1);
    expect(written()).not.toHaveProperty("skillTreeProgress");
    expect(written()).not.toHaveProperty("strength");
  });

  it("порожні classes зберігають level з тіла", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true, campaign: campaign(true) } as never);

    await patch({ classes: [], level: 1 });

    expect(written().level).toBe(1);

    vi.mocked(prisma.character.update).mockClear();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...baseCharacter, level: 1, classes: [] } as never);

    await patch({ classes: [], level: 1 });

    expect(written().level).toBe(1);
  });

  it("очищення classes прибирає pact і кола 6–9 зі слотів", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true, campaign: campaign(true) } as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      ...baseCharacter,
      level: 5,
      classes: [{ classId: "c1", level: 5 }],
      spellSlots: { "1": { max: 4, current: 2 }, "6": { max: 1, current: 1 }, pact: { level: 3, max: 2, current: 2 } },
    } as never);

    await patch({ classes: [] });

    const slots = written().spellSlots as Record<string, unknown>;

    expect(slots).not.toHaveProperty("pact");
    expect(slots).not.toHaveProperty("6");
  });

  it("class у тілі необов'язковий, якщо є непорожні classes", async () => {
    const { updateCharacterSchema } = await import("@/lib/server/characters/core/update-character-schema");

    expect(updateCharacterSchema.safeParse({ class: "", classes: [{ classId: "c1", level: 1 }] }).success).toBe(true);
    expect(updateCharacterSchema.safeParse({ class: "", classes: [] }).success).toBe(false);
  });
});

// Domain assertions keep their DB doubles; real shared locking is covered by storage integration.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
