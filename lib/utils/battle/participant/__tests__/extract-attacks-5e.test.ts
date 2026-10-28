import { describe, expect, it } from "vitest";

import { extractAttacksFromCharacter } from "../extract-attacks";

const artifactRow = (o: { id: string; slot: string; modifiers: Array<{ type: string; value: string }> }) => ({ name: o.id, bonuses: {}, ...o }) as never;

const byId = (...rows: Array<{ id: string }>) => Object.fromEntries(rows.map((r) => [r.id, r])) as never;

const character = (equipped: Record<string, string>) => ({ id: "c", campaignId: "camp", inventory: { equipped } }) as never;

const rapier = artifactRow({ id: "r", slot: "weapon", modifiers: [{ type: "damageDice", value: "1d8" }, { type: "traits", value: "finesse" }] });

const dagger = artifactRow({ id: "d", slot: "weapon", modifiers: [{ type: "damageDice", value: "1d4" }, { type: "traits", value: "light,finesse,thrown" }, { type: "range", value: "20/60" }] });

const longsword = artifactRow({ id: "l", slot: "weapon", modifiers: [{ type: "damageDice", value: "1d8" }, { type: "traits", value: "versatile" }, { type: "versatileDice", value: "1d10" }] });

describe("extractAttacksFromCharacter 5e", () => {
  it("off-hand from shield cell only in 5e", async () => {
    const c = character({ weapon: "r", shield: "d" });

    const fiveE = await extractAttacksFromCharacter(c, byId(rapier, dagger), undefined, { fiveE: true });

    expect(fiveE.find((a) => a.hand === "off")).toMatchObject({ id: "d:off", damageDice: "1d4", traits: ["light", "finesse", "thrown"] });

    const homm = await extractAttacksFromCharacter(c, byId(rapier, dagger));

    expect(homm.some((a) => a.hand === "off")).toBe(false);
    expect(homm.some((a) => a.id === "d:off")).toBe(false);
    expect(homm.find((a) => a.id === "r")).not.toHaveProperty("traits");
  });

  it("versatile die when shield cell empty", async () => {
    const two = await extractAttacksFromCharacter(character({ weapon: "l" }), byId(longsword), undefined, { fiveE: true });

    expect(two.find((a) => a.id === "l")?.damageDice).toBe("1d10");

    const one = await extractAttacksFromCharacter(character({ weapon: "l", shield: "d" }), byId(longsword, dagger), undefined, { fiveE: true });

    expect(one.find((a) => a.id === "l")?.damageDice).toBe("1d8");
  });

  it("HOMM ignores versatile die and traits", async () => {
    const a = await extractAttacksFromCharacter(character({ weapon: "l" }), byId(longsword));

    expect(a.find((x) => x.id === "l")).toMatchObject({ damageDice: "1d8" });
    expect(a.find((x) => x.id === "l")).not.toHaveProperty("versatileDice");
  });

  it("thrown weapon stays melee in 5e (main and off hand), keeps range; HOMM unchanged", async () => {
    const c = character({ weapon: "d", shield: "d2" });

    const dagger2 = artifactRow({ id: "d2", slot: "weapon", modifiers: [{ type: "damageDice", value: "1d4" }, { type: "traits", value: "light,thrown" }, { type: "range", value: "20/60" }] });

    const fiveE = await extractAttacksFromCharacter(c, byId(dagger, dagger2), undefined, { fiveE: true });

    expect(fiveE.find((a) => a.id === "d")).toMatchObject({ type: "melee", range: "20/60" });
    expect(fiveE.find((a) => a.id === "d2:off")).toMatchObject({ type: "melee", range: "20/60" });

    const homm = await extractAttacksFromCharacter(character({ weapon: "d" }), byId(dagger));

    expect(homm.find((a) => a.id === "d")?.type).toBe("ranged");
  });

  it("default melee is a flat 1 (unarmed strike) in 5e, empty in HOMM", async () => {
    const c = character({});

    const fiveE = await extractAttacksFromCharacter(c, byId(), undefined, { fiveE: true });

    expect(fiveE.find((a) => a.id === "default-melee")?.damageDice).toBe("1");
    expect(fiveE.find((a) => a.id === "default-ranged")?.damageDice).toBe("");

    const homm = await extractAttacksFromCharacter(c, byId());

    expect(homm.find((a) => a.id === "default-melee")?.damageDice).toBe("");
  });
});
