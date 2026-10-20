import { describe, expect, it } from "vitest";

import { strikeD20 } from "../strike-rolls";

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
