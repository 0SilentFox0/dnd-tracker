import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { advanceFxQueue, INITIAL_FX_QUEUE, shiftFxQueue } from "@/lib/utils/battle/fx";

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
    expect(shiftFxQueue(s2).queue).toEqual([]);
  });

  it("disabled advances seen without queueing", () => {
    const s1 = advanceFxQueue(INITIAL_FX_QUEUE, [melee(1)], false);

    const s2 = advanceFxQueue(s1, [melee(1), melee(2)], false);

    expect(s2).toMatchObject({ seen: 2, queue: [] });
  });
});
