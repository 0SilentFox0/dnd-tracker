import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import { notifyCampaignPlayers } from "@/lib/server/notifications/notify";
import { loadPlayedSections } from "@/lib/server/scenario/page-store";
import { logger } from "@/lib/utils/common/logger";
import type { ScenarioContent } from "@/types/scenario";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/common/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/server/notifications/notify", () => ({ notifyCampaignPlayers: vi.fn() }));
vi.mock("@/lib/server/scenario/page-store", () => ({ loadPlayedSections: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { campaign: { findUnique: vi.fn() }, acquaintance: { findMany: vi.fn() } } }));

const loadReveal = () => import("@/lib/server/acquaintances/reveal");

const item = (id: string) => ({ type: "acquaintance", refId: id, href: `/campaigns/c1/acquaintances?focus=${id}` });

const sec = (id: string, played: boolean) => ({ id, title: id, played, rows: [] });

const content = (...sections: ReturnType<typeof sec>[]): ScenarioContent => ({ legend: [], sections });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ acquaintancesEnabled: true } as never);
  vi.mocked(loadPlayedSections).mockResolvedValue([{ id: "p1", played: ["s0", "s1"] }]);
  vi.mocked(notifyCampaignPlayers).mockResolvedValue(1);
});

describe("notifyAcquaintanceReveal", () => {
  it("sends nothing when the toggle is off", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ acquaintancesEnabled: false } as never);

    await (await loadReveal()).notifyAcquaintanceReveal("c1", "p1", ["s1"]);

    expect(notifyCampaignPlayers).not.toHaveBeenCalled();
    expect(prisma.acquaintance.findMany).not.toHaveBeenCalled();
  });

  it("notifies about an acquaintance whose source section was just played", async () => {
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([{ id: "a1", sourcePageId: "p1", sourceSectionId: "s1" }] as never);

    await (await loadReveal()).notifyAcquaintanceReveal("c1", "p1", ["s1"]);

    expect(notifyCampaignPlayers).toHaveBeenCalledWith({ campaignId: "c1", items: [item("a1")] });
  });

  it("notifies about a new journal entry of an already revealed acquaintance but not of a hidden one", async () => {
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([
      { id: "a2", sourcePageId: "p1", sourceSectionId: "s0" },
      { id: "a9", sourcePageId: "p1", sourceSectionId: "s9" },
    ] as never);

    await (await loadReveal()).notifyAcquaintanceReveal("c1", "p1", ["s1"]);

    expect(notifyCampaignPlayers).toHaveBeenCalledWith({ campaignId: "c1", items: [item("a2")] });
  });

  it("sends one item when the acquaintance and its entry share a section", async () => {
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([{ id: "a1", sourcePageId: "p1", sourceSectionId: "s1" }] as never);

    await (await loadReveal()).notifyAcquaintanceReveal("c1", "p1", ["s1"]);

    expect(vi.mocked(notifyCampaignPlayers).mock.calls[0][0].items).toHaveLength(1);
  });

  it("sends nothing when no acquaintance is revealed", async () => {
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([{ id: "a9", sourcePageId: "p1", sourceSectionId: "s9" }] as never);

    await (await loadReveal()).notifyAcquaintanceReveal("c1", "p1", ["s1"]);

    expect(notifyCampaignPlayers).not.toHaveBeenCalled();
  });

  it("swallows a notification failure and logs it", async () => {
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([{ id: "a1", sourcePageId: "p1", sourceSectionId: "s1" }] as never);
    vi.mocked(notifyCampaignPlayers).mockRejectedValue(new Error("boom"));

    await expect((await loadReveal()).notifyAcquaintanceReveal("c1", "p1", ["s1"])).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith("[acquaintances] reveal notify failed", { campaignId: "c1", pageId: "p1" }, expect.any(Error));
  });
});

describe("notifyRevealForContentChange", () => {
  it("notifies for sections that became played", async () => {
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([{ id: "a1", sourcePageId: "p1", sourceSectionId: "s1" }] as never);

    await (await loadReveal()).notifyRevealForContentChange("c1", "p1", content(sec("s1", false)), content(sec("s1", true)));

    await vi.waitFor(() => expect(notifyCampaignPlayers).toHaveBeenCalledTimes(1));
  });

  it("does nothing when no section newly became played", async () => {
    await (await loadReveal()).notifyRevealForContentChange("c1", "p1", content(sec("s1", true)), content(sec("s1", true)));

    expect(prisma.campaign.findUnique).not.toHaveBeenCalled();
    expect(notifyCampaignPlayers).not.toHaveBeenCalled();
  });
});

describe("notifyRevealForContentChange inside a content transaction", () => {
  it("sends nothing until the transaction commits, so a rollback never notifies", async () => {
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([{ id: "a1", sourcePageId: "p1", sourceSectionId: "s1" }] as never);

    const afterCommit: Array<() => void> = [];

    const { notifyRevealForContentChange } = await loadReveal();

    await runContentWriteContext("c1", {}, () => notifyRevealForContentChange("c1", "p1", content(sec("s1", false)), content(sec("s1", true))), afterCommit);

    expect(afterCommit).toHaveLength(1);
    expect(notifyCampaignPlayers).not.toHaveBeenCalled();

    await afterCommit[0]();

    expect(notifyCampaignPlayers).toHaveBeenCalledTimes(1);
  });
});
