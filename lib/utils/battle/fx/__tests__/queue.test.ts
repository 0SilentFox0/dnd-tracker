import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { advanceFxQueue, INITIAL_FX_QUEUE, MAX_FX_QUEUE, shiftFxQueue } from "@/lib/utils/battle/fx";

describe("advanceFxQueue", () => {
  const melee = (i: number) => action({ actionIndex: i, id: `b-${i}`, actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } });

  it("same log reference → same state", () => {
    const log = [melee(1)];

    const s = advanceFxQueue(INITIAL_FX_QUEUE, log, true);

    expect(advanceFxQueue(s, log, true)).toBe(s);
  });

  it("first log queues nothing, a newer entry queues its specs", () => {
    const s1 = advanceFxQueue(INITIAL_FX_QUEUE, [melee(1)], true);

    expect(s1.queue).toEqual([]);

    const s2 = advanceFxQueue(s1, [melee(1), melee(2)], true);

    expect(s2.queue.map((q) => q.key)).toEqual(["b-2:0"]);
    expect(shiftFxQueue(s2, "b-2:0").queue).toEqual([]);
  });

  it("disabled advances seen without queueing", () => {
    const s1 = advanceFxQueue(INITIAL_FX_QUEUE, [melee(1)], false);

    const s2 = advanceFxQueue(s1, [melee(1), melee(2)], false);

    expect(s2).toMatchObject({ seen: 2, queue: [] });
  });

  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => melee(from + i));

  it("hidden/disabled with a pending queue drops it, then a new entry queues nothing", () => {
    const s1 = advanceFxQueue(advanceFxQueue(INITIAL_FX_QUEUE, [melee(1)], true), range(1, 3), true);

    expect(s1.queue).toHaveLength(2);

    const s2 = advanceFxQueue(s1, s1.log ?? [], false);

    expect(s2).toMatchObject({ seen: 3, queue: [] });

    const s3 = advanceFxQueue(s2, range(1, 5), false);

    expect(s3).toMatchObject({ seen: 5, queue: [] });

    expect(advanceFxQueue(s3, range(1, 5), true).queue).toEqual([]);
  });

  it("inactive with an empty queue and the same log → same state", () => {
    const s = advanceFxQueue(INITIAL_FX_QUEUE, [melee(1)], false);

    expect(advanceFxQueue(s, s.log ?? [], false)).toBe(s);
  });

  it("trimming keeps the playing head", () => {
    let s = advanceFxQueue(INITIAL_FX_QUEUE, [melee(0)], true);

    s = advanceFxQueue(s, range(0, 6), true);

    const head = s.queue[0].key;

    expect(head).toBe("b-1:0");

    s = advanceFxQueue(s, range(0, 12), true);
    s = advanceFxQueue(s, range(0, 18), true);

    expect(s.queue).toHaveLength(MAX_FX_QUEUE);
    expect(s.queue[0].key).toBe(head);
    expect(s.queue.at(-1)?.key).toBe("b-18:0");
  });

  it("a stale done (another key) does not shift the queue", () => {
    const s = advanceFxQueue(advanceFxQueue(INITIAL_FX_QUEUE, [melee(1)], true), range(1, 3), true);

    expect(shiftFxQueue(s, "b-1:0")).toBe(s);
    expect(shiftFxQueue(s, "b-2:0").queue.map((q) => q.key)).toEqual(["b-3:0"]);
  });
});
