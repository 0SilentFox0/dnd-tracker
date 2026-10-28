import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import type { MoraleThrow } from "@/lib/utils/battle/fx/dice";
import { advanceFxQueue, type FxQueueState, INITIAL_FX_QUEUE, MAX_FX_QUEUE, shiftFxQueue } from "@/lib/utils/battle/fx/queue";
import type { BattleAction } from "@/types/battle";

const adv = (s: FxQueueState, log: BattleAction[], active: boolean, morale: MoraleThrow | null = null) => advanceFxQueue(s, { log, morale }, active);

describe("advanceFxQueue", () => {
  const melee = (i: number) => action({ actionIndex: i, id: `b-${i}`, actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } });

  it("same log reference → same state", () => {
    const log = [melee(1)];

    const s = adv(INITIAL_FX_QUEUE, log, true);

    expect(adv(s, log, true)).toBe(s);
  });

  it("first log queues nothing, a newer entry queues its specs", () => {
    const s1 = adv(INITIAL_FX_QUEUE, [melee(1)], true);

    expect(s1.queue).toEqual([]);

    const s2 = adv(s1, [melee(1), melee(2)], true);

    expect(s2.queue.map((q) => q.key)).toEqual(["b-2:0"]);
    expect(shiftFxQueue(s2, "b-2:0").queue).toEqual([]);
  });

  it("disabled advances seen without queueing", () => {
    const s1 = adv(INITIAL_FX_QUEUE, [melee(1)], false);

    const s2 = adv(s1, [melee(1), melee(2)], false);

    expect(s2).toMatchObject({ seen: 2, queue: [] });
  });

  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => melee(from + i));

  it("hidden/disabled with a pending queue drops it, then a new entry queues nothing", () => {
    const s1 = adv(adv(INITIAL_FX_QUEUE, [melee(1)], true), range(1, 3), true);

    expect(s1.queue).toHaveLength(2);

    const s2 = adv(s1, s1.log ?? [], false);

    expect(s2).toMatchObject({ seen: 3, queue: [] });

    const s3 = adv(s2, range(1, 5), false);

    expect(s3).toMatchObject({ seen: 5, queue: [] });

    expect(adv(s3, range(1, 5), true).queue).toEqual([]);
  });

  it("inactive with an empty queue and the same log → same state", () => {
    const s = adv(INITIAL_FX_QUEUE, [melee(1)], false);

    expect(adv(s, s.log ?? [], false)).toBe(s);
  });

  it("trimming keeps the playing head", () => {
    let s = adv(INITIAL_FX_QUEUE, [melee(0)], true);

    s = adv(s, range(0, 6), true);

    const head = s.queue[0].key;

    expect(head).toBe("b-1:0");

    s = adv(s, range(0, 12), true);
    s = adv(s, range(0, 18), true);

    expect(s.queue).toHaveLength(MAX_FX_QUEUE);
    expect(s.queue[0].key).toBe(head);
    expect(s.queue.at(-1)?.key).toBe("b-18:0");
  });

  it("a stale done (another key) does not shift the queue", () => {
    const s = adv(adv(INITIAL_FX_QUEUE, [melee(1)], true), range(1, 3), true);

    expect(shiftFxQueue(s, "b-1:0")).toBe(s);
    expect(shiftFxQueue(s, "b-2:0").queue.map((q) => q.key)).toEqual(["b-3:0"]);
  });

  describe("morale dice", () => {
    const m = (d10: number): MoraleThrow => ({ key: `1:0:p:${d10}`, spec: { seed: 1, groups: [[{ sides: 10, value: d10 }]] } });

    const base = adv(INITIAL_FX_QUEUE, [melee(1)], true);

    it("new pending → dice spec before the log specs", () => {
      const s = adv(base, [melee(1), melee(2)], true, m(5));

      expect(s.queue.map((q) => q.key)).toEqual(["morale:1:0:p:5", "b-2:0"]);
      expect(s.queue[0]).toMatchObject({ archetype: "dice", actorId: "p" });
    });

    it("same key again → nothing", () => {
      const log = base.log ?? [];

      const s = adv(base, log, true, m(5));

      expect(adv(s, log, true, m(5))).toBe(s);
      expect(adv(shiftFxQueue(s, "morale:1:0:p:5"), log, true, m(5)).queue).toEqual([]);
    });

    it("first render → nothing, key stored", () => {
      const s = adv(INITIAL_FX_QUEUE, [melee(1)], true, m(5));

      expect(s.queue).toEqual([]);
      expect(s.morale).toBe("1:0:p:5");
    });

    it("inactive → nothing, key stored", () => {
      const s = adv(base, [melee(1)], false, m(5));

      expect(s.queue).toEqual([]);
      expect(s.morale).toBe("1:0:p:5");
      expect(adv(s, [melee(1)], true, m(5)).queue).toEqual([]);
    });
  });
});
