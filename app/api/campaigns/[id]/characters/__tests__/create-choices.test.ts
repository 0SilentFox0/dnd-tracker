import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { refs, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, classes: { enabled: true } } } })) }));
vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => refs) }));
vi.mock("@/lib/server/characters/apply-classes", () => ({
  applyClasses: vi.fn(async ({ entries }: { entries: unknown[] }) => ({ ok: true, data: entries.length ? { classes: entries, level: 1, class: "Sorcerer", subclass: null, spellSlots: {} } : null })),
}));
vi.mock("@/lib/server/characters/core/resolve-character-owner", () => ({ resolveCharacterOwner: vi.fn(async () => ({ controlledBy: "p1" })) }));
vi.mock("@/lib/server/characters/core/derive-character-defaults", () => ({ deriveCharacterDefaults: vi.fn(async () => ({ spellSlots: {} })) }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));
vi.mock("@/lib/db", () => ({ prisma: { character: { create: vi.fn(async ({ data }: { data: object }) => ({ id: "new", ...data })) }, characterInventory: { create: vi.fn() } } }));

const body = { name: "Lia", type: "player", controlledBy: "p1", race: "Elf", classes: [{ classId: sorcerer.id, level: 1 }] };

const post = async (extra: object) => {
  const { createCharacter } = await import("../create-character");

  return createCharacter(new Request("http://x", { method: "POST", body: JSON.stringify({ ...body, ...extra }) }), "camp") as Promise<NextResponse>;
};

describe("create character with choices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes race picks, subrace, origin feat and class picks", async () => {
    const res = await post({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] }, feats: [{ id: "f-alert", source: "origin" }], classes: [{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-firebolt" }] } }] });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.create).mock.calls[0][0].data).toMatchObject({
      raceChoices: { "elven-lineage": [{ id: "wood-elf" }] },
      subrace: "Wood Elf",
      feats: [{ id: "f-alert", source: "origin" }],
      classes: [{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-firebolt" }] } }],
    });
  });

  it("422 on an invalid pick; no choices → no new keys", async () => {
    expect((await post({ classes: [{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-cure" }] } }] })).status).toBe(422);

    await post({});

    expect(vi.mocked(prisma.character.create).mock.calls.at(-1)?.[0].data).not.toHaveProperty("raceChoices");
  });
});

// Domain assertions keep their DB doubles; real shared locking is covered by storage integration.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
