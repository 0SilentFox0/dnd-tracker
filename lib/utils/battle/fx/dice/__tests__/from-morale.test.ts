import { describe, expect, it } from "vitest";

import { moraleThrowOf } from "@/lib/utils/battle/fx/dice";

const input = { round: 2, turnIndex: 3, pending: { participantId: "p1", d10Roll: 7 }, participant: { name: "Айвен" } };

describe("moraleThrowOf", () => {
  it("ключ, d10, підпис і детермінований seed", () => {
    const a = moraleThrowOf(input);

    expect(a?.key).toBe("2:3:p1:7");
    expect(a?.spec).toMatchObject({ groups: [[{ sides: 10, value: 7 }]], caption: "Айвен · мораль", extraSaves: 0 });
    expect(moraleThrowOf(input)?.spec.seed).toBe(a?.spec.seed);
  });

  it("без очікування або без видимого учасника — null", () => {
    expect(moraleThrowOf({ ...input, pending: null })).toBeNull();
    expect(moraleThrowOf({ ...input, participant: null })).toBeNull();
  });
});
