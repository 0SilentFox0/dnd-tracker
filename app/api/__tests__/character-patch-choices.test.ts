import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/server/characters/apply-classes", () => ({ applyClasses: vi.fn(async ({ entries }: { entries: unknown[] }) => ({ ok: true, data: { classes: entries, level: 4, class: "Sorcerer", subclass: null, spellSlots: {} } })) }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));
vi.mock("@/lib/db", () => {
  const prisma: Record<string, unknown> = {
    $queryRaw: vi.fn(async () => []),
    character: { findUnique: vi.fn(), update: vi.fn(async ({ data }: { data: object }) => ({ id: "ch", ...data })) },
    race: { findFirst: vi.fn(async () => null) },
  };

  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const stored = { id: "ch", campaignId: "camp", controlledBy: "p", status: "active", level: 4, seenLevel: 4, race: "Elf", avatar: null, spellcastingAbility: null, spellSlots: {}, immunities: [], classes: [{ classId: "s", level: 4, choices: { metamagic: [{ id: "quickened" }] } }] };

describe("PATCH character keeps stored class picks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, allowPlayerEdit: true, rules: { ...DEFAULT_RULES, classes: { enabled: true } } } } as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue(stored as never);
  });

  it("stale incoming picks are ignored", async () => {
    const { patchCharacter } = await import("@/app/api/campaigns/[id]/characters/[characterId]/patch-character");

    const res = (await patchCharacter(new Request("http://x", { method: "PATCH", body: JSON.stringify({ classes: [{ classId: "s", level: 4, choices: { metamagic: [{ id: "twinned" }] } }] }) }), "camp", "ch")) as NextResponse;

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data.classes).toEqual([{ classId: "s", level: 4, choices: { metamagic: [{ id: "quickened" }] } }]);
  });

  it("picks come from the row re-read under the lock, not from the stale first read", async () => {
    const { patchCharacter } = await import("@/app/api/campaigns/[id]/characters/[characterId]/patch-character");

    const fresh = { ...stored, classes: [{ classId: "s", level: 4, choices: { metamagic: [{ id: "subtle" }] } }] };

    vi.mocked(prisma.character.findUnique).mockResolvedValueOnce(stored as never).mockResolvedValueOnce(fresh as never);

    await patchCharacter(new Request("http://x", { method: "PATCH", body: JSON.stringify({ classes: [{ classId: "s", level: 4 }] }) }), "camp", "ch");

    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data.classes).toEqual([{ classId: "s", level: 4, choices: { metamagic: [{ id: "subtle" }] } }]);
  });
});
