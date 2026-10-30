import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { sessionDmActor } from "@/lib/utils/api/actor";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({ campaign: { findUnique: vi.fn() } }));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, cb: () => unknown) => cb() }));
vi.mock("@/lib/server/assistant/proposals", () => ({ applyProposal: vi.fn(), createProposal: vi.fn() }));
vi.mock("@/lib/server/scenario/action-service", () => ({
  scenarioFingerprint: () => "fp",
  scenarioResult: vi.fn(),
  scenarioState: vi.fn(async () => ({ version: 1, title: "T", page: { id: "p", title: "T", version: 1, content: { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [] }] } } })),
}));

const caller = { actor: sessionDmActor("camp", "dm"), locale: "uk", threadId: null } as never;

const prepare = async (ops: unknown[]) => {
  const { SCENARIO_EDIT_ACTION } = await import("@/lib/server/assistant/actions/scenario-edit");

  return (SCENARIO_EDIT_ACTION as unknown as { prepare: (c: unknown, i: unknown) => Promise<unknown> }).prepare(caller, { pageId: "p", summary: "x", ops });
};

describe("scenario.propose-edit prepare", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createAcquaintance on a campaign with acquaintances disabled fails early", async () => {
    db.campaign.findUnique.mockResolvedValue({ acquaintancesEnabled: false });

    await expect(prepare([{ op: "createAcquaintance", ref: "b", name: "Беатріс" }])).rejects.toMatchObject({ status: 403, message: API_ERRORS.ACQUAINTANCES_DISABLED });
  });

  it("ops without createAcquaintance do not consult the campaign flag", async () => {
    await prepare([{ op: "renameSection", sectionId: "s", title: "Нова" }]);

    expect(db.campaign.findUnique).not.toHaveBeenCalled();
  });

  it("preview carries only the resolved ops, not the page dump", async () => {
    const preview = (await prepare([{ op: "renameSection", sectionId: "s", title: "Нова" }])) as { changes: { before: unknown; path: string }[] };

    expect(preview.changes[0].before).toBeNull();
    expect(preview.changes[0].path).toBe("ops");
    expect(JSON.stringify(preview)).not.toContain('"sections"');
  });
});
