import { describe, expect, it } from "vitest";

import { retaliate, swordUnit } from "./helpers";

import { ParticipantSide } from "@/lib/constants/battle";

const norm = (v: unknown) => JSON.parse(JSON.stringify(v, (k, x) => (k === "id" || k === "timestamp" || k === "createdAt" ? "~" : x)));

describe("resolveRetaliation якір (байт-у-байт)", () => {
  it.each([0.85, 0.05, 0.99])("rng %s", (v) => {
    let calls = 0;

    const values = [v, 0.4, 0.7, 0.2, 0.9, 0.3];

    const rng = () => values[calls++ % values.length];

    const r = resolveRetaliation_(rng);

    expect({ calls, action: norm(r?.battleAction), hp: r?.participants.map((p) => p.combatStats.currentHp) }).toMatchSnapshot();
  });
});

function resolveRetaliation_(rng: () => number) {
  const a = swordUnit("a", ParticipantSide.ALLY);

  const d = swordUnit("d", ParticipantSide.ENEMY);

  return retaliate([a, d], undefined, rng);
}
