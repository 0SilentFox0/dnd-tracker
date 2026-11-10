import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  artifact: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  campaign: { findUnique: vi.fn(), update: async () => ({ contentVersion: 1 }) },
  $transaction: vi.fn(async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }], campaign: { update: async () => ({ contentVersion: 1 }) } })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));

const persistIcon = vi.hoisted(() => vi.fn(async () => "https://cdn/icon.png"));

vi.mock("@/lib/server/artifacts/persist-icon", () => ({ persistIcon }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { importContent } from "@/lib/server/content/import/import-content";
import { artifactsResource } from "@/lib/server/content/resources/artifacts";
import { createContent, updateContent } from "@/lib/server/content/service";
import type { Actor } from "@/lib/utils/api/actor";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const armour = { type: "armour", locations: { head: 1, arm: 1, body: 2, leg: 1 }, kind: "mail", qualities: [], weight: 5, price: 10 };

const setRules = (rules: unknown) => db.campaign.findUnique.mockResolvedValue({ rules });

describe("artifact systemStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.artifact.create.mockResolvedValue({ id: "a1" });
    db.artifact.update.mockResolvedValue({ id: "a1" });
    db.artifact.findFirst.mockResolvedValue({ id: "a1", campaignId: "c1", icon: null, slot: "armor", modifiers: [] });
  });

  it("d20 campaign rejects non-null systemStats", async () => {
    setRules({});

    const error = await createContent(artifactsResource, actor, { name: "Mail", slot: "armor", systemStats: armour }).catch((e) => e);

    expect(error).toMatchObject({ status: 400, message: API_ERRORS.SYSTEM_STATS_UNSUPPORTED });
    expect(db.artifact.create).not.toHaveBeenCalled();
  });

  it("dry-run preview rejects systemStats in a d20 campaign", async () => {
    setRules({});

    const rows = [{ name: "Plate", slot: "armor", systemStats: armour }];

    const report = await importContent(actor, "artifacts", { rows, mode: "create", dryRun: true }, { resource: () => artifactsResource, loadNames: async () => [] });

    expect(report.results[0].status).toBe("error");
    expect(JSON.stringify(report.results)).toContain(API_ERRORS.SYSTEM_STATS_UNSUPPORTED);
    expect(db.artifact.create).not.toHaveBeenCalled();

    setRules(WFRP_RULES);

    const ok = await importContent(actor, "artifacts", { rows, mode: "create", dryRun: true }, { resource: () => artifactsResource, loadNames: async () => [] });

    expect(ok.results[0].status).toBe("created");
  });

  it("wfrp campaign stores valid stats", async () => {
    setRules(WFRP_RULES);
    await createContent(artifactsResource, actor, { name: "Mail", slot: "armor", systemStats: armour });

    expect(db.artifact.create.mock.calls[0][0].data.systemStats).toEqual(armour);

    await updateContent(artifactsResource, actor, "a1", { systemStats: armour });

    expect(db.artifact.update.mock.calls[0][0].data.systemStats).toEqual(armour);
  });

  it("wfrp campaign rejects invalid stats with issues", async () => {
    setRules(WFRP_RULES);

    const error = await updateContent(artifactsResource, actor, "a1", { systemStats: { ...armour, locations: { head: 9, arm: 0, body: 0, leg: 0 } } }).catch((e) => e);

    expect(error).toMatchObject({ status: 400, message: API_ERRORS.SYSTEM_STATS_INVALID });
    expect((error as { issues?: unknown[] }).issues?.length).toBeGreaterThan(0);
    expect(db.artifact.update).not.toHaveBeenCalled();
  });

  it("invalid stats are rejected before an icon is uploaded", async () => {
    setRules(WFRP_RULES);

    const invalid = { ...armour, locations: { head: 9, arm: 0, body: 0, leg: 0 } };

    await expect(createContent(artifactsResource, actor, { name: "Mail", slot: "armor", icon: "data:image/png;base64,AAAA", systemStats: invalid })).rejects.toMatchObject({ status: 400 });
    await expect(updateContent(artifactsResource, actor, "a1", { icon: "data:image/png;base64,AAAA", systemStats: invalid })).rejects.toMatchObject({ status: 400 });
    expect(persistIcon).not.toHaveBeenCalled();
  });

  it("null clears and omitted keeps (even on d20)", async () => {
    setRules({});
    await updateContent(artifactsResource, actor, "a1", { systemStats: null });

    expect(db.artifact.update.mock.calls[0][0].data).toHaveProperty("systemStats");
    expect(db.artifact.update.mock.calls[0][0].data.systemStats).not.toEqual(armour);

    await updateContent(artifactsResource, actor, "a1", { name: "Renamed" });

    expect(db.artifact.update.mock.calls[1][0].data).not.toHaveProperty("systemStats");
    expect(db.campaign.findUnique).not.toHaveBeenCalled();
  });
});

describe("artifact import systemStats", () => {
  const deps = { resource: () => artifactsResource, loadNames: async () => [{ id: "a1", name: "Mail" }] };

  beforeEach(() => {
    vi.clearAllMocks();
    db.artifact.create.mockResolvedValue({ id: "a1" });
    db.artifact.update.mockResolvedValue({ id: "a1" });
    db.artifact.findFirst.mockResolvedValue({ id: "a1", campaignId: "c1", icon: null, slot: "armor", modifiers: [] });
  });

  it("wfrp stores systemStats from an import row; dnd5e rejects the row and creates nothing", async () => {
    for (const rules of [{}, { system: { key: "dnd5e" } }]) {
      setRules(rules);

      const report = await importContent(actor, "artifacts", { rows: [{ name: "Plate", slot: "armor", systemStats: JSON.stringify(armour) }], mode: "create", dryRun: false }, deps);

      expect(JSON.stringify(report.results)).toContain(API_ERRORS.SYSTEM_STATS_UNSUPPORTED);
    }

    expect(db.artifact.create).not.toHaveBeenCalled();

    setRules(WFRP_RULES);

    await importContent(actor, "artifacts", { rows: [{ name: "Plate", slot: "armor", systemStats: JSON.stringify(armour) }], mode: "create", dryRun: false }, deps);

    expect(db.artifact.create.mock.calls[0][0].data.systemStats).toEqual(armour);
  });

  it("update: an empty (null) or omitted column keeps; a value replaces", async () => {
    setRules(WFRP_RULES);

    await importContent(actor, "artifacts", { rows: [{ name: "Mail", systemStats: null }], mode: "update", dryRun: false }, deps);
    await importContent(actor, "artifacts", { rows: [{ name: "Mail", description: "x" }], mode: "update", dryRun: false }, deps);

    await importContent(actor, "artifacts", { rows: [{ name: "Mail", systemStats: JSON.stringify(armour) }], mode: "update", dryRun: false }, deps);

    expect(db.artifact.update.mock.calls[0][0].data).not.toHaveProperty("systemStats");
    expect(db.artifact.update.mock.calls[1][0].data).not.toHaveProperty("systemStats");
    expect(db.artifact.update.mock.calls[2][0].data.systemStats).toEqual(armour);
  });
});
