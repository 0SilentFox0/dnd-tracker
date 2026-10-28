import { beforeEach, describe, expect, it, vi } from "vitest";

import { CAMPAIGN_ACTIONS } from "@/lib/server/assistant/actions/campaign";
import { CONTENT_ACTIONS } from "@/lib/server/assistant/actions/content";
import { SCENARIO_ACTIONS } from "@/lib/server/assistant/actions/scenario";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { requestDigest } from "@/lib/server/assistant/intent-store";
import { campaignState, runCampaignOperation } from "@/lib/server/campaigns/action-service";

const h = vi.hoisted(() => ({
  campaign: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  campaignMember: { findUnique: vi.fn(), findMany: vi.fn(async () => []), deleteMany: vi.fn() },
  apiToken: { update: vi.fn(), create: vi.fn() },
  aiThread: { update: vi.fn() },
  $queryRaw: vi.fn(async () => [{ id: "c" }]),
  create: vi.fn(), template: vi.fn(), export: vi.fn(async () => ({ settings: {}, formatVersion: 1 })),
}));

vi.mock("@/lib/db", () => ({ prisma: { ...h, $transaction: (fn: (db: typeof h) => unknown) => fn(h) } }));
vi.mock("@/lib/cache/campaign-list", () => ({ invalidateCampaignLists: vi.fn() }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn(), ReferenceKind: { RACES: "races" } }));
vi.mock("@/lib/server/campaigns/create-campaign", () => ({ createCampaignFromBundle: h.create, loadTemplateForUser: h.template }));
vi.mock("@/lib/server/templates/export-campaign", () => ({ exportCampaign: h.export }));
vi.mock("@/lib/server/templates/list-templates", () => ({ listTemplates: vi.fn(async () => ({ official: [], mine: [] })) }));

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const row = { id: "c", name: "Кампанія", description: null, kind: "campaign", visibility: "private", maxLevel: 10, allowPlayerEdit: false, status: "active", aiInstructions: "Пиши українською", inviteCode: "SECRET", updatedAt: new Date(1), members: [] };

describe("campaign action guards", () => {
  beforeEach(() => { vi.clearAllMocks(); h.campaign.findUnique.mockResolvedValue(row); h.campaign.update.mockImplementation(async ({ data }) => ({ ...row, ...data })); h.create.mockResolvedValue({ campaign: { id: "new", name: "Нова", inviteCode: "CREATED_SECRET" }, warnings: [] }); });
  it("cannotRemoveDm", async () => {
    h.campaignMember.findUnique.mockResolvedValue({ campaignId: "c", userId: "dm", role: "dm" });
    await expect(runCampaignOperation(actor, "members.remove", { memberId: "member" })).rejects.toMatchObject({ status: 400 });
    expect(h.campaignMember.deleteMany).not.toHaveBeenCalled();
  });
  it("cannotSetOfficialWithoutAdmin", async () => {
    await expect(runCampaignOperation(actor, "template.update", { patch: { visibility: "official" } })).rejects.toMatchObject({ status: 403 });
    expect(h.campaign.update).not.toHaveBeenCalled();
  });
  it("inviteNeverInToolOutput", async () => {
    expect(JSON.stringify(await runCampaignOperation(actor, "status", {}))).not.toContain("SECRET");
    expect(JSON.stringify(await runCampaignOperation(actor, "clone", { name: "Нова" }))).not.toContain("CREATED_SECRET");
  });
  it("cloneDoesNotGrantTokenNewScope", async () => {
    const result = await runCampaignOperation(actor, "clone", { name: "Нова" });

    expect(result.data).toMatchObject({ id: "new", href: "/campaigns/new/dm" });
    expect(h.apiToken.create).not.toHaveBeenCalled();
    expect(h.apiToken.update).not.toHaveBeenCalled();
    expect(CAMPAIGN_ACTIONS.find(a => a.id === "campaign.clone")?.need.sessionOnly).toBe(true);
  });
  it("settingsConcurrentEditStale", async () => {
    const expected = requestDigest(await campaignState(actor, "settings", {}));

    h.campaign.findUnique.mockResolvedValue({ ...row, name: "Змінено" });
    await expect(runCampaignOperation(actor, "settings", { patch: { name: "Моя" } }, expected)).rejects.toMatchObject({ status: 409 });
    expect(h.campaign.update).not.toHaveBeenCalled();
  });
  it("instructionsEditIsNotPolicyEdit", async () => {
    await runCampaignOperation(actor, "instructions.set", { instructions: "Нова" });
    expect(h.campaign.update).toHaveBeenCalledWith(expect.objectContaining({ data: { aiInstructions: "Нова" } }));
    expect(h.aiThread.update).not.toHaveBeenCalled();
    expect(h.apiToken.update).not.toHaveBeenCalled();
  });
  it("members are bounded and omit private account fields", async () => {
    h.campaignMember.findMany.mockResolvedValue(Array.from({ length: 4 }, (_, i) => ({ id: `m${i}`, userId: `u${i}`, role: "player", user: { displayName: `Гравець ${i}`, email: "PRIVATE_EMAIL" } })) as never);

    const result = await runCampaignOperation(actor, "members", { offset: 1, limit: 2 });

    expect(result.data).toMatchObject({ offset: 1, items: [{ id: "m1" }, { id: "m2" }], nextOffset: 3 });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_EMAIL");
  });
  it("export is an explicit UI download handoff", () => {
    expect(CONTENT_ACTIONS.find(a => a.id === "campaign.export")?.effect).toBe("handoff");
  });
  it("create rejects inaccessible templates without importing data", async () => {
    h.template.mockResolvedValue({ ok: false, status: 403 });
    await expect(runCampaignOperation(actor, "create", { name: "Нова", templateId: "foreign" })).rejects.toMatchObject({ status: 403 });
    expect(h.create).not.toHaveBeenCalled();
  });
  it("template lock contention gives a retryable conflict before export", async () => {
    h.$queryRaw.mockResolvedValueOnce([{ id: "c" }]).mockRejectedValueOnce(new Error("locked"));
    await expect(runCampaignOperation(actor, "create", { name: "Нова", templateId: "source" })).rejects.toMatchObject({ status: 409 });
    expect(h.export).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
  });
  it("token cannot execute session-only lifecycle operations", async () => {
    await expect(runCampaignOperation({ ...actor, via: "token", scopes: ["campaign:write"] }, "clone", { name: "Нова" })).rejects.toMatchObject({ status: 403 });
    expect(h.create).not.toHaveBeenCalled();
  });
  it("content scenario and campaign adapters form one catalog without duplicate actions", () => {
    expect(() => createActionCatalog([...CONTENT_ACTIONS, ...SCENARIO_ACTIONS, ...CAMPAIGN_ACTIONS])).not.toThrow();
  });
  it("deleteCampaignReceiptSurvivesCascade policy", () => {
    expect(CAMPAIGN_ACTIONS.find(a => a.id === "campaign.delete")).toMatchObject({ confirmation: "always", need: { sessionOnly: true } });
  });
});
