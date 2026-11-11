import { describe, expect, it } from "vitest";

import { heldBy, settle } from "../momentum";

const sides = { attacker: "ally", target: "enemy" } as const;

describe("settle", () => {
  it("attacker gains a token", () => {
    expect(settle({}, sides, { spent: false, gainedBy: "attacker" })).toEqual({ next: { ally: true }, gained: true });
  });

  it("spending clears the token", () => {
    expect(settle({ ally: true }, sides, { spent: true, gainedBy: null })).toEqual({ next: {}, gained: false });
  });

  it("spend and win keeps the token without a gain line", () => {
    expect(settle({ ally: true }, sides, { spent: true, gainedBy: "attacker" })).toEqual({ next: { ally: true }, gained: false });
  });

  it("defender keeps the token by winning, loses it otherwise", () => {
    expect(settle({ enemy: true }, sides, { spent: false, gainedBy: "defender" })).toEqual({ next: { enemy: true }, gained: false });
    expect(settle({ enemy: true }, sides, { spent: false, gainedBy: null }).next).toEqual({});
  });

  it("attacker win drops the defender token", () => {
    expect(settle({ enemy: true }, sides, { spent: false, gainedBy: "attacker" }).next).toEqual({ ally: true });
  });
});

describe("heldBy", () => {
  it("reads the side", () => {
    expect(heldBy({ ally: true }, "ally")).toBe(true);
    expect(heldBy({ ally: true }, "enemy")).toBe(false);
  });
});
