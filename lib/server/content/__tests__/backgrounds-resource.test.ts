import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ $queryRaw: vi.fn(), background: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() }, character: { count: vi.fn() }, spell: { count: vi.fn(async () => 0) }, feat: { findFirst: vi.fn() } }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
import { backgroundsResource } from "@/lib/server/content/resources/backgrounds";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c", userId: "u", isDM: true, via: "session", scopes: null };

const row = { id: "b", campaignId: "c", name: "Sage", choices: [], skillProficiencies: [], toolProficiencies: [], originFeatId: null };

describe("background resource integrity", () => {
  beforeEach(() => { vi.resetAllMocks(); db.background.findFirst.mockResolvedValue(null); db.character.count.mockResolvedValue(0); });
  it("rejects non-origin or foreign feat before writing", async () => {
    for (const feat of [null, { id: "f", type: "general" }]) {
      db.feat.findFirst.mockResolvedValue(feat);
      await expect(backgroundsResource.create(actor, { name: "Sage", choices: [], skillProficiencies: [], toolProficiencies: [], originFeatId: "f" })).rejects.toMatchObject({ status: 422 });
    }
    expect(db.background.create).not.toHaveBeenCalled();
  });
  it("guards deletion and ASI updates for used backgrounds", async () => {
    db.character.count.mockResolvedValue(1);
    await expect(backgroundsResource.remove(actor, row as never)).rejects.toMatchObject({ status: 409 });
    await expect(backgroundsResource.update(actor, row as never, { choices: [{ id: "asi", label: "ASI", kind: "abilityScore", level: 1, count: 3, points: 3 }] })).rejects.toMatchObject({ status: 409 });
    await backgroundsResource.update(actor, row as never, { description: "Updated" });
    expect(db.background.update).toHaveBeenCalled();
  });
});

it("rejects direct and option spell references outside the campaign", async () => {
  vi.clearAllMocks();
  db.background.findFirst.mockResolvedValue(null);

  const choices = [{ id: "gift", label: "Gift", kind: "option", count: 1, level: 1, options: [{ id: "magic", name: "Magic", abilities: [], spells: [{ level: 1, spellId: "foreign" }] }] }];

  await expect(backgroundsResource.create(actor, { name: "Sage", choices, skillProficiencies: [], toolProficiencies: [] } as never)).rejects.toMatchObject({ status: 422 });
  expect(db.background.create).not.toHaveBeenCalled();
});

it("keeps the feat type origin while a background references it", async () => {
  const { featsResource } = await import("@/lib/server/content/resources/feats");

  db.background.findFirst.mockResolvedValue({ id: "b" });
  await expect(featsResource.update(actor, { id: "f", type: "origin" } as never, { type: "general" })).rejects.toMatchObject({ status: 409 });
});

it("guards removing a used background origin with stored ASI", async () => {
  vi.clearAllMocks();
  db.character.count.mockResolvedValue(1);
  db.feat.findFirst.mockResolvedValue({ id: "origin", type: "origin", choices: [{ id: "asi", label: "ASI", kind: "abilityScore", level: 1, count: 1, points: 1 }] });
  await expect(backgroundsResource.update(actor, { ...row, originFeatId: "origin" } as never, { originFeatId: null })).rejects.toMatchObject({ status: 409 });
  expect(db.background.update).not.toHaveBeenCalled();
});

it("guards removal of a used background feat choice that may contain ASI", async () => {
  vi.clearAllMocks();
  db.character.count.mockResolvedValue(1);
  await expect(backgroundsResource.update(actor, { ...row, choices: [{ id: "feat", label: "Feat", kind: "feat", level: 1, count: 1, featTypes: ["general"] }] } as never, { choices: [] })).rejects.toMatchObject({ status: 409 });
});

it("guards ASI definition edits of a feat used through a background", async () => {
  const { featsResource } = await import("@/lib/server/content/resources/feats");

  vi.clearAllMocks();
  db.$queryRaw.mockResolvedValue([{ count: BigInt(1) }]);
  await expect(featsResource.update(actor, { id: "f", choices: [] } as never, { choices: [{ id: "asi", label: "ASI", kind: "abilityScore", level: 1, count: 1, points: 1 }] })).rejects.toMatchObject({ status: 409 });
});
