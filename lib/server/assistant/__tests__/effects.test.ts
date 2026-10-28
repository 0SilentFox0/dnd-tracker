import { describe, expect, it } from "vitest";

import { runDurableEffects } from "@/lib/server/assistant/effects";

describe("assistant post-commit effects", () => {
  it("deduplicates effect keys without replaying completed effects", async () => {
    const effects = [{ key: "event", kind: "publish" as const, payload: { seq: 4 } }, { key: "event", kind: "publish" as const, payload: { seq: 4 } }];

    const seen: unknown[] = [];

    const result = await runDurableEffects(effects, { publish: async (payload) => { seen.push(payload); } }, []);

    expect(seen).toEqual([{ seq: 4 }]);
    expect(result).toEqual({ status: "complete", completed: ["event"] });
    await runDurableEffects(effects, { publish: async (payload) => { seen.push(payload); } }, result.completed);
    expect(seen).toHaveLength(1);
  });

  it("unknown handler or failure is reported, never fictitious success", async () => {
    const effect = { key: "media", kind: "media-cleanup" as const, payload: {} };

    expect(await runDurableEffects([effect], {}, [])).toEqual({ status: "failed", completed: [] });
    expect(await runDurableEffects([effect], { "media-cleanup": async () => { throw new Error("private storage error"); } }, [])).toEqual({ status: "failed", completed: [] });
  });
});
