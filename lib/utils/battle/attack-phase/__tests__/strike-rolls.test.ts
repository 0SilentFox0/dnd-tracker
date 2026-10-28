import { describe, expect, it } from "vitest";

import { damageDiceCursor, strikeD20 } from "../strike-rolls";

import { seq } from "@/lib/utils/abilities/__tests__/fixtures";

const request = { singleRoll: undefined, usePerTargetRolls: false };

describe("strikeD20", () => {
  it("надісланий кидок — не серверний", () => {
    expect(strikeD20({ attackRolls: [12] } as never, { singleRoll: 12, usePerTargetRolls: false }, { index: 0, chosenAt: 0, expanded: true }, seq(0.5))).toEqual({ value: 12, serverRolled: false });
  });

  it("розширена ціль без кидка — докидає сервер", () => {
    expect(strikeD20({} as never, request, { index: 1, chosenAt: -1, expanded: true }, seq(0.5))).toEqual({ value: 11, serverRolled: true });
  });
});

describe("damageDiceCursor", () => {
  it("a doubled crit strike does not shift the next target's dice", () => {
    const cursor = damageDiceCursor([5, 6, 2], "1d8", seq(0.5));

    expect(cursor.next().rolls).toEqual([5]);
    cursor.hit(true);
    expect(cursor.next().rolls).toEqual([2]);
  });

  it("a plain hit advances by one set", () => {
    const cursor = damageDiceCursor([5, 2], "1d8", seq(0.5));

    cursor.next();
    cursor.hit();
    expect(cursor.next().rolls).toEqual([2]);
  });
});
