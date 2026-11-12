import { describe, expect, it } from "vitest";

import { type Addon, composeCached, composeParts, composeSystem, compositionOrder, validateComposition } from "@/lib/utils/rules/systems/compose";
import type { SystemMeta } from "@/lib/utils/rules/systems/meta";
import { ruleSystemByKey } from "@/lib/utils/rules/systems/registry";
import type { ActGate, ParticipantPart, UnitPartRow } from "@/lib/utils/rules/systems/types";

const m = (module: string, extra: Partial<SystemMeta> = {}): SystemMeta => ({ module, kind: "addon", keys: [], requires: ["core"], i18n: {}, ...extra });

const metas: SystemMeta[] = [
  { module: "core", kind: "base", keys: ["plain"], i18n: {} },
  { module: "other", kind: "base", keys: ["otherkey"], i18n: {} },
  m("a"),
  m("b", { requires: ["core", "a"] }),
  m("c", { after: ["b"] }),
  m("x", { claims: ["slot"], conflicts: ["y"] }),
  m("y", { claims: ["slot"], conflicts: ["x"] }),
  m("z", { claims: ["slot"] }),
  m("p", { claims: ["magic"] }),
  m("q", { claims: ["magic.slots"] }),
  m("pq", { claims: ["magic", "magic.slots"] }),
  m("needs-b", { requires: ["core", "b"] }),
  m("foreign", { requires: ["other"] }),
  m("loop1", { requires: ["core", "loop2"] }),
  m("loop2", { requires: ["core", "loop1"] }),
];

const codes = (modules: string[]) => validateComposition({ key: "plain", modules }, metas).map((i) => i.code);

describe("compositionOrder", () => {
  it("does not depend on input order", () => {
    expect(compositionOrder("core", ["c", "b", "a"], metas)).toEqual(["a", "b", "c"]);
    expect(compositionOrder("core", ["a", "c", "b"], metas)).toEqual(["a", "b", "c"]);
  });

  it("orders equal levels by id", () => expect(compositionOrder("core", ["z", "x", "a"], metas)).toEqual(["a", "x", "z"]));

  it("throws on a cycle", () => expect(() => compositionOrder("core", ["loop1", "loop2"], metas)).toThrow("cycle"));
});

describe("validateComposition", () => {
  it("accepts a valid set", () => expect(codes(["a", "b", "c"])).toEqual([]));

  it("reports missing requires, conflicts, double claims, cycles, foreign base and unknown ids", () => {
    expect(codes(["needs-b"])).toEqual(["missingRequires"]);
    expect(codes(["x", "y"])).toEqual(expect.arrayContaining(["conflict", "duplicateClaim"]));
    expect(codes(["x", "z"])).toEqual(["duplicateClaim"]);
    expect(codes(["loop1", "loop2"])).toEqual(["cycle"]);
    expect(codes(["foreign"])).toEqual(["wrongBase"]);
    expect(codes(["nope"])).toEqual(["unknownModule"]);
    expect(validateComposition({ key: "nope" }, metas).map((i) => i.code)).toEqual(["unknownKey"]);
  });

  it("reports a prefix collision between different owners", () => {
    expect(codes(["p", "q"])).toEqual(["duplicateClaim"]);
    expect(codes(["q", "p"])).toEqual(["duplicateClaim"]);
  });

  it("allows one owner to claim a slot and its sub-slot, and unrelated prefixes", () => {
    expect(codes(["pq"])).toEqual([]);
    expect(codes(["q", "a"])).toEqual([]);
  });

  it("reports a conflict pair once", () => expect(codes(["x", "y"]).filter((c) => c === "conflict")).toHaveLength(1));
});

interface Toy {
  hooks: readonly string[];
  dict: Record<string, number>;
  nested: { fn(): string; list: readonly number[] };
  group?: { run(): string };
}

const base: Toy = { hooks: ["base"], dict: { a: 1 }, nested: { fn: () => "base", list: [1] } };

const add = (id: string, build: Addon<Toy>["build"], claims?: string[]): Addon<Toy> => ({ id, build, claims });

describe("composeParts", () => {
  const kinds = { groups: ["group"], dictionaries: ["dict"] };

  it("concatenates lists base first, in composition order", () => {
    const out = composeParts(base, [add("m1", () => ({ hooks: ["m1"] })), add("m2", () => ({ hooks: ["m2"], nested: { list: [2] } }))], kinds);

    expect(out.hooks).toEqual(["base", "m1", "m2"]);
    expect(out.nested.list).toEqual([1, 2]);
    expect(out.nested.fn()).toBe("base");
  });

  it("does not duplicate arrays a builder spreads from prev", () => {
    const out = composeParts(base, [add("m1", (prev) => ({ hooks: prev.hooks, nested: { ...prev.nested, list: prev.nested.list } }))], kinds);

    expect(out.hooks).toEqual(["base"]);
    expect(out.nested.list).toEqual([1]);
  });

  it("unions dictionaries and rejects a collision", () => {
    expect(composeParts(base, [add("m1", () => ({ dict: { b: 2 } }))], kinds).dict).toEqual({ a: 1, b: 2 });
    expect(() => composeParts(base, [add("m1", () => ({ dict: { a: 2 } }))], kinds)).toThrow(/duplicate key "a"/);
  });

  it("rejects replacing an exclusive slot without a claim", () => {
    expect(() => composeParts(base, [add("m1", () => ({ nested: { fn: () => "m1" } }))], kinds)).toThrow(/without a claim/);
  });

  it("gives the claimant prev and lets it delegate", () => {
    const out = composeParts(base, [add("m1", (prev) => ({ nested: { fn: () => `${prev.nested.fn()}+m1` } }), ["nested.fn"])], kinds);

    expect(out.nested.fn()).toBe("base+m1");
  });

  it("chains prev through successive addons", () => {
    const out = composeParts(base, [add("m1", () => ({ hooks: ["m1"] })), add("m2", (prev) => ({ hooks: [`saw ${prev.hooks.length}`] }))], kinds);

    expect(out.hooks).toEqual(["base", "m1", "saw 2"]);
  });

  it("replaces a group only through claims", () => {
    const withGroup: Toy = { ...base, group: { run: () => "base" } };

    expect(() => composeParts(withGroup, [add("m1", () => ({ group: { run: () => "m1" } }))], kinds)).toThrow(/without a claim/);
    expect(composeParts(withGroup, [add("m1", () => ({ group: { run: () => "m1" } }), ["group"])], kinds).group?.run()).toBe("m1");
  });

  it("adds a group the base does not have", () => expect(composeParts(base, [add("m1", () => ({ group: { run: () => "m1" } }))], kinds).group?.run()).toBe("m1"));
});

describe("composeSystem", () => {
  it("applies a claimed progression.maxHp with prev and leaves the base untouched", () => {
    const d20 = ruleSystemByKey("dnd5e");

    if (!d20) throw new Error("dnd5e missing");

    const claimed = composeSystem(d20, [{ id: "m", claims: ["progression.maxHp"], build: (prev) => ({ progression: { maxHp: (input) => prev.progression.maxHp(input) } }) }]);

    const plain = composeSystem(d20, []);

    expect(claimed).not.toBe(plain);
    expect(claimed.progression.maxHp).not.toBe(d20.progression.maxHp);
    expect(plain.progression.maxHp).toBe(d20.progression.maxHp);
  });

  it("concatenates participant parts and act gates of several addons in composition order", () => {
    const d20 = ruleSystemByKey("dnd5e");

    if (!d20) throw new Error("dnd5e missing");

    const partA: ParticipantPart<UnitPartRow> = (p) => p;

    const partB: ParticipantPart<UnitPartRow> = (p) => p;

    const gateA: ActGate = () => null;

    const gateB: ActGate = () => null;

    const out = composeSystem(d20, [
      { id: "a", build: () => ({ participant: { fromUnit: [partA] }, combat: { turn: { actGates: [gateA] } } }) },
      { id: "b", build: () => ({ participant: { fromUnit: [partB] }, combat: { turn: { actGates: [gateB] } } }) },
    ]);

    expect(out.participant?.fromUnit).toEqual([partA, partB]);
    expect(out.combat.turn?.actGates).toEqual([gateA, gateB]);
  });
});

describe("composeCached", () => {
  it("caches per key + modules and does not share between sets", () => {
    const cache = new Map<string, object>();

    const make = () => ({});

    const one = composeCached(cache, { key: "homm" }, make);

    expect(composeCached(cache, { key: "homm" }, make)).toBe(one);
    expect(composeCached(cache, { key: "homm", modules: ["x"] }, make)).not.toBe(one);
    expect(cache.size).toBe(2);
  });
});
