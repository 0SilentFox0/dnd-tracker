import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ feat: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() } }));

const nameTaken = vi.hoisted(() => vi.fn());

const inUse = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedFeats: vi.fn(async () => []) }));
vi.mock("@/lib/server/feats/feat-name", () => ({ featNameTaken: nameTaken }));
vi.mock("@/lib/server/feats/feat-usage", () => ({ featInUse: inUse }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createFeatSchema } from "@/lib/schemas";
import { featsResource } from "@/lib/server/content/resources/feats";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const existing = { id: "f1", campaignId: "c1", name: "Alert" } as never;

describe("featsResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nameTaken.mockResolvedValue(false);
    inUse.mockResolvedValue(false);
  });

  it("creates with schema defaults; a taken name is 409", async () => {
    await featsResource.create(actor, createFeatSchema.parse({ name: "Alert", type: "origin" }));

    expect(db.feat.create).toHaveBeenCalledWith({ data: expect.objectContaining({ campaignId: "c1", name: "Alert", type: "origin", repeatable: false, prerequisite: {}, abilities: [], choices: [] }) });

    nameTaken.mockResolvedValue(true);

    await expect(featsResource.create(actor, createFeatSchema.parse({ name: "Alert" }))).rejects.toMatchObject({ status: 409 });
  });

  it("PATCH writes only the given JSON fields", async () => {
    await featsResource.update(actor, existing, { repeatable: true });

    expect(db.feat.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { repeatable: true } });
  });

  it("delete: 409 FEAT_IN_USE while a hero holds it", async () => {
    inUse.mockResolvedValue(true);

    await expect(featsResource.remove(actor, existing)).rejects.toMatchObject({ status: 409, message: API_ERRORS.FEAT_IN_USE });
    expect(db.feat.deleteMany).not.toHaveBeenCalled();

    inUse.mockResolvedValue(false);
    await featsResource.remove(actor, existing);

    expect(db.feat.deleteMany).toHaveBeenCalledWith({ where: { id: "f1", campaignId: "c1" } });
  });
});
