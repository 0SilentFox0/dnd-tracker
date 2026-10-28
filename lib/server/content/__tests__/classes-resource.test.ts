import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  gameClass: { create: vi.fn(), deleteMany: vi.fn() },
  character: { count: vi.fn() },
}));

const nameTaken = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedClasses: vi.fn(async () => []) }));
vi.mock("@/lib/server/classes/class-name", () => ({ classNameTaken: nameTaken }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createClassSchema } from "@/lib/schemas";
import { classesResource } from "@/lib/server/content/resources/classes";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

describe("classesResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nameTaken.mockResolvedValue(false);
    db.character.count.mockResolvedValue(0);
  });

  it("creates with schema defaults", async () => {
    await classesResource.create(actor, createClassSchema.parse({ name: "Воїн" }));

    expect(db.gameClass.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ campaignId: "c1", name: "Воїн", hitDie: 8, caster: "none", spellcastingAbility: null, subclassLevel: null }),
    });
  });

  it("taken name → 409", async () => {
    nameTaken.mockResolvedValue(true);

    await expect(classesResource.create(actor, createClassSchema.parse({ name: "Воїн" }))).rejects.toMatchObject({ status: 409 });
    expect(db.gameClass.create).not.toHaveBeenCalled();
  });

  it("remove with characters using the class → 409 CLASS_IN_USE", async () => {
    db.character.count.mockResolvedValue(1);

    await expect(classesResource.remove(actor, { id: "k1" } as never)).rejects.toMatchObject({ message: API_ERRORS.CLASS_IN_USE, status: 409 });
    expect(db.character.count).toHaveBeenCalledWith({ where: { campaignId: "c1", classes: { array_contains: [{ classId: "k1" }] } } });
    expect(db.gameClass.deleteMany).not.toHaveBeenCalled();
  });

  it("remove without characters deletes", async () => {
    await classesResource.remove(actor, { id: "k1" } as never);

    expect(db.gameClass.deleteMany).toHaveBeenCalledWith({ where: { id: "k1", campaignId: "c1" } });
  });
});
