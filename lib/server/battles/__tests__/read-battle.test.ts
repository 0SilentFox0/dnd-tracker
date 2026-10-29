import { describe, expect, it, vi } from "vitest";

import { readBattleScene } from "@/lib/server/battles/read-battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { readScenePreview } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { LoadedBattle } from "@/lib/utils/battle/store";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", controlledBy: "u-player" } });

function loaded(over: Partial<LoadedBattle & { isMember: boolean }> = {}): LoadedBattle & { isMember: boolean } {
  return {
    scene: {
      id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 3, eventSeq: 4,
      pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null,
    },
    meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, critChoiceByDm: false, map: null, createdAt: new Date("2026-01-01") },
    participants: [hero],
    pending: [],
    isDM: false,
    isMember: true,
    ...over,
  };
}

function deps(over: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    getUserId: vi.fn(async () => "u-player"),
    rateLimit: vi.fn(),
    loadBattle: vi.fn(async () => loaded()),
    saveBattle: vi.fn(),
    publish: vi.fn(),
    loadRecentEvents: vi.fn(async () => []),
    ...over,
  } as PipelineDeps;
}

const params = { id: "c1", battleId: "b1" };

describe("readBattleScene", () => {
  it("401 without a session", async () => {
    const res = await readBattleScene(params, deps({ getUserId: async () => null }));

    expect(res.status).toBe(401);
  });

  it("404 when the battle is not found", async () => {
    const res = await readBattleScene(params, deps({ loadBattle: async () => null }));

    expect(res.status).toBe(404);
  });

  it("403 for a non-member", async () => {
    const res = await readBattleScene(params, deps({ loadBattle: async () => loaded({ isMember: false }) }));

    expect(res.status).toBe(403);
  });

  it("answers the scene without saving or publishing", async () => {
    const d = deps();
    const res = await readBattleScene(params, d);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("b1");
    expect(body.version).toBe(3);
    expect(body.initiativeOrder.map((p: { basicInfo: { id: string } }) => p.basicInfo.id)).toEqual(["hero"]);
    expect(d.saveBattle).not.toHaveBeenCalled();
    expect(d.publish).not.toHaveBeenCalled();
    expect(d.rateLimit).not.toHaveBeenCalled();
  });

  it("runs the read inside the campaign write lock and passes its errors through", async () => {
    const withWrite = vi.fn(async (_id: string, cb: () => Promise<unknown>) => cb()) as unknown as PipelineDeps["withWrite"];
    const res = await readBattleScene(params, deps({ withWrite }));

    expect(res.status).toBe(200);
    expect(withWrite).toHaveBeenCalledWith("c1", expect.any(Function));
  });

  it("maps a lock failure to its status", async () => {
    const { ContentError } = await import("@/lib/server/content/errors");
    const withWrite = (async () => { throw new ContentError("campaign_not_found", 404); }) as PipelineDeps["withWrite"];
    const res = await readBattleScene(params, deps({ withWrite }));

    expect(res.status).toBe(404);
  });
});

describe("readScenePreview", () => {
  it("builds the full scene with recent events and no mutation", async () => {
    const loadRecentEvents = vi.fn(async () => []);
    const preview = await readScenePreview("u-player", loaded(), { includeRecentEvents: 5 }, { loadRecentEvents });

    expect(loadRecentEvents).toHaveBeenCalledWith("b1", 5);
    expect(preview.id).toBe("b1");
    expect(preview.initiativeOrder).toHaveLength(1);
  });

  it("loads knowledge for a player who does not see enemy stats", async () => {
    const loadKnowledge = vi.fn(async () => ({}));

    await readScenePreview("u-player", loaded(), { includeKnowledge: true }, { loadRecentEvents: async () => [], loadKnowledge });
    expect(loadKnowledge).toHaveBeenCalledWith("b1");
  });

  it("skips knowledge for the DM", async () => {
    const loadKnowledge = vi.fn(async () => ({}));

    await readScenePreview("dm", loaded({ isDM: true }), { includeKnowledge: true }, { loadRecentEvents: async () => [], loadKnowledge });
    expect(loadKnowledge).not.toHaveBeenCalled();
  });
});
