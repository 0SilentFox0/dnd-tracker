import { beforeEach, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ publishShow: vi.fn(), clearShowBattle: vi.fn(), cleanup: vi.fn(), invalidate: vi.fn(), track: vi.fn(), trigger: vi.fn() }));

vi.mock("@/lib/server/show/show-store", () => ({ publishShow: f.publishShow, clearShowBattle: f.clearShowBattle }));
vi.mock("@/lib/server/show/media-effects", () => ({ runShowMediaCleanup: f.cleanup }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger: f.trigger } }));
vi.mock("@/lib/server/assistant/actions/content-effects", () => ({ CONTENT_EFFECT_HANDLERS: { invalidate: f.invalidate, "media-cleanup": f.track } }));
import { runDurableEffects } from "../effects";
import { ASSISTANT_EFFECT_HANDLERS } from "../runtime-effects";
beforeEach(() => { vi.resetAllMocks(); });
it("composes content, battle and show effects without overwriting handlers", async () => {
  const result = await runDurableEffects([
    { key: "content", kind: "invalidate", payload: { campaignId: "c", kinds: ["units"] } },
    { key: "track", kind: "media-cleanup", payload: { campaignId: "c", url: "https://x/t.mp3" } },
    { key: "show", kind: "publish", payload: { campaignId: "c", show: { seq: 1 } } },
    { key: "slides", kind: "media-cleanup", payload: { campaignId: "c", urls: ["https://x/s.webp"] } },
    { key: "battle", kind: "publish", payload: { battleMessages: [{ channel: "battle-b", event: "delta", payload: { version: 2 } }] } },
    { key: "left", kind: "invalidate", payload: { campaignId: "c", battleId: "b", battleLeftActive: true } },
  ], ASSISTANT_EFFECT_HANDLERS, []);

  expect(result).toMatchObject({ status: "complete", completed: ["content", "track", "show", "slides", "battle", "left"] });
  expect(f.publishShow).toHaveBeenCalledWith("c", { seq: 1 }, { strict: true });
  expect(f.cleanup).toHaveBeenCalledWith({ campaignId: "c", urls: ["https://x/s.webp"] });
  expect(f.invalidate).toHaveBeenCalled(); expect(f.track).toHaveBeenCalled(); expect(f.clearShowBattle).toHaveBeenCalledWith("c", "b", { strict: true });
});
it("external failures remain failed and completed effects are never repeated", async () => {
  f.trigger.mockRejectedValue(new Error("Provider down"));

  const effects = [{ key: "b", kind: "publish" as const, payload: { battleMessages: [{ channel: "b", event: "delta", payload: {} }] } }];

  expect(await runDurableEffects(effects, ASSISTANT_EFFECT_HANDLERS, [])).toEqual({ status: "failed", completed: [] });
  f.trigger.mockClear();
  expect(await runDurableEffects(effects, ASSISTANT_EFFECT_HANDLERS, ["b"])).toEqual({ status: "complete", completed: ["b"] });
  expect(f.trigger).not.toHaveBeenCalled();
});
