import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  artifact: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  artifactSet: { findFirst: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

const resolveIcon = vi.hoisted(() => vi.fn());

const sync = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/supabase/artifact-icon-storage", () => ({ resolveArtifactIconForPersistence: resolveIcon }));
vi.mock("@/lib/server/artifacts/sync-artifact-set-members", async (importOriginal) => ({ ...(await importOriginal<object>()), syncArtifactSetMembers: sync }));

import { SyncArtifactSetError } from "@/lib/server/artifacts/sync-artifact-set-members";
import { artifactSetsResource } from "@/lib/server/content/resources/artifact-sets";
import { artifactsResource } from "@/lib/server/content/resources/artifacts";
import { createContent, updateContent } from "@/lib/server/content/service";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

describe("artifact resources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("іконка, яку не вдалося зберегти → 422 з текстом сховища, без запису", async () => {
    resolveIcon.mockResolvedValue({ ok: false, message: "Завеликий файл" });

    const error = await createContent(artifactsResource, actor, { name: "Меч", slot: "weapon", icon: "data:image/png;base64,AAA" }).catch((e) => e);

    expect(error).toMatchObject({ status: 422, message: "Завеликий файл" });
    expect(db.artifact.create).not.toHaveBeenCalled();
  });

  it("PATCH з тією самою іконкою не перезавантажує її", async () => {
    db.artifact.findFirst.mockResolvedValue({ id: "a1", campaignId: "c1", icon: "https://x/i.png" });
    db.artifact.update.mockResolvedValue({ id: "a1" });

    await updateContent(artifactsResource, actor, "a1", { icon: "https://x/i.png" });

    expect(resolveIcon).not.toHaveBeenCalled();
  });

  it("сет з артефактом іншої кампанії → 400 ContentError", async () => {
    db.artifactSet.findFirst.mockResolvedValue({ id: "s1", campaignId: "c1", icon: null });
    sync.mockRejectedValue(new SyncArtifactSetError("Усі артефакти мають належати цій кампанії та існувати в базі."));

    const error = await updateContent(artifactSetsResource, actor, "s1", { artifactIds: ["foreign"] }).catch((e) => e);

    expect(error).toMatchObject({ status: 400 });
  });
});
