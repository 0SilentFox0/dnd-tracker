import { describe, expect, it } from "vitest";

import { D6POOL_SLOT } from "./fixtures/d6pool/definition";
import { D6POOL_META } from "./fixtures/d6pool/meta";
import { D6POOL_SERVER } from "./fixtures/d6pool/server";
import { D6POOL_UI } from "./fixtures/d6pool/ui";
import { D6POOL_ALT_MODULE } from "./fixtures/d6pool-alt/definition";
import { D6POOL_ALT_DECLARED_META, D6POOL_ALT_META } from "./fixtures/d6pool-alt/meta";
import { D6POOL_ALT_SERVER } from "./fixtures/d6pool-alt/server";
import { D6POOL_ALT_UI } from "./fixtures/d6pool-alt/ui";
import { D6POOL_PLUS_MODULE, D6POOL_PLUS_SLOT, D6POOL_TURN_SYSTEM, type D6TurnSystem, runTurnStart } from "./fixtures/d6pool-plus/definition";
import { D6POOL_PLUS_META } from "./fixtures/d6pool-plus/meta";
import { D6POOL_PLUS_SERVER } from "./fixtures/d6pool-plus/server";
import { D6POOL_PLUS_UI } from "./fixtures/d6pool-plus/ui";
import { assertMatrixCase, type ComposeFn, graphViolations, matrixCases } from "./helpers/composition-matrix";

import { composeUi } from "@/components/systems/compose";
import { SYSTEM_UI, systemUiOf } from "@/components/systems/registry";
import { composeServer } from "@/lib/server/systems/compose";
import { systemServerOf } from "@/lib/server/systems/registry";
import { composition } from "@/lib/utils/rules/systems/catalog";
import { type Addon, composeParts, compositionOrder, SYSTEM_FIELD_KINDS, validateComposition } from "@/lib/utils/rules/systems/compose";
import { SYSTEM_META, type SystemMeta } from "@/lib/utils/rules/systems/meta";
import { ruleSystemOf } from "@/lib/utils/rules/systems/registry";

const REAL: readonly SystemMeta[] = SYSTEM_META;

const realCompose: ComposeFn = (key, modules) => {
  const system = { key, ...(modules ? { modules: [...modules] } : {}) };

  return { definition: ruleSystemOf({ system }), ui: modules ? systemUiOf(key, modules) : SYSTEM_UI[key], server: systemServerOf({ system }) };
};

const FIXTURE_METAS: readonly SystemMeta[] = [D6POOL_META, D6POOL_PLUS_META, D6POOL_ALT_DECLARED_META];

const FIXTURE_PARTS = {
  "d6pool-plus": { def: D6POOL_PLUS_MODULE, ui: D6POOL_PLUS_UI, server: D6POOL_PLUS_SERVER, claims: D6POOL_PLUS_META.claims },
  "d6pool-alt": { def: D6POOL_ALT_MODULE, ui: D6POOL_ALT_UI, server: D6POOL_ALT_SERVER, claims: D6POOL_ALT_META.claims },
} as const;

const fixtureCompose = (metas: readonly SystemMeta[]): ComposeFn => (key, modules) => {
  const { base, modules: ids } = composition({ key, modules: modules && [...modules] }, metas);

  const ordered = compositionOrder(base, ids, metas) as (keyof typeof FIXTURE_PARTS)[];

  const pick = <T>(of: (p: (typeof FIXTURE_PARTS)[keyof typeof FIXTURE_PARTS]) => unknown): Addon<T>[] =>
    ordered.map((id) => ({ id, claims: FIXTURE_PARTS[id].claims, build: of(FIXTURE_PARTS[id]) as Addon<T>["build"] }));

  return {
    definition: composeParts(D6POOL_TURN_SYSTEM, pick<D6TurnSystem>((p) => p.def), SYSTEM_FIELD_KINDS),
    ui: composeUi(D6POOL_UI, pick((p) => p.ui)),
    server: composeServer(D6POOL_SERVER, pick((p) => p.server)),
  };
};

describe("module graph contract", () => {
  it("the real metas have no graph violations", () => expect(graphViolations(REAL)).toEqual([]));

  it("the fixture metas have no graph violations", () => expect(graphViolations(FIXTURE_METAS)).toEqual([]));

  it("requires pointing at a missing module is a violation", () => {
    const metas = [D6POOL_META, { ...D6POOL_PLUS_META, requires: ["d6pool", "ghost"] }];

    expect(graphViolations(metas)).toEqual(["d6pool-plus: references unknown module ghost"]);
  });

  it("a requires cycle is a violation", () => {
    const metas: SystemMeta[] = [D6POOL_META, { ...D6POOL_PLUS_META, requires: ["d6pool", "d6pool-alt"] }, { ...D6POOL_ALT_META, requires: ["d6pool", "d6pool-plus"] }];

    expect(graphViolations(metas).some((v) => v.startsWith("requires cycle"))).toBe(true);
  });

  it("a pair with the same claims and no conflicts is a violation", () => {
    expect(graphViolations([D6POOL_META, D6POOL_PLUS_META, D6POOL_ALT_META])).toEqual(["d6pool-plus and d6pool-alt both claim turn.order without a declared conflict"]);
  });

  it("declaring the conflict on either side is enough", () => {
    expect(graphViolations([D6POOL_META, { ...D6POOL_PLUS_META, conflicts: ["d6pool-alt"] }, D6POOL_ALT_META])).toEqual([]);
  });

  it("a preset that fails validateComposition is a violation", () => {
    const preset: SystemMeta = { module: "d6preset", kind: "preset", keys: ["d6preset"], preset: { base: "d6pool", modules: ["d6pool-plus", "d6pool-alt"] }, i18n: {} };

    expect(graphViolations([...FIXTURE_METAS, preset]).some((v) => v.startsWith("preset d6preset"))).toBe(true);
  });
});

describe("composition matrix", () => {
  describe("real systems", () => {
    const cases = matrixCases(REAL);

    it("covers every base and preset", () => expect(cases.map((c) => c.label)).toEqual(expect.arrayContaining(REAL.flatMap((m) => m.keys.map((k) => `preset ${k}`)))));

    it.each(cases.map((c) => [c.label, c] as const))("%s", (_label, c) => assertMatrixCase(REAL, c, realCompose));
  });

  describe("fixtures", () => {
    const cases = matrixCases(FIXTURE_METAS);

    it("lists the base, the preset and each module alone; the conflicting pair gives no full set", () => {
      expect(cases.map((c) => c.label)).toEqual(["preset d6pool", "base d6pool (d6pool) alone", "d6pool-plus on d6pool", "d6pool-alt on d6pool"]);
    });

    it.each(cases.map((c) => [c.label, c] as const))("%s", (_label, c) => assertMatrixCase(FIXTURE_METAS, c, fixtureCompose(FIXTURE_METAS)));
  });
});

describe("fixture modules d6pool-plus and d6pool-alt", () => {
  const compose = fixtureCompose(FIXTURE_METAS);

  it("d6pool + d6pool-plus composes: hooks run base first, ui and server dictionaries are merged", () => {
    const { definition, ui, server } = compose("d6pool", ["d6pool-plus"]);

    expect(runTurnStart(definition as D6TurnSystem, 0)).toEqual({ pool: 3, log: ["base", "plus"] });
    expect(ui.rulesSections?.initiative).toBeTypeOf("function");
    expect(Object.keys(server.operations ?? {})).toEqual(["d6poolFocus"]);
  });

  it("the base alone keeps only its own hook", () => {
    expect(runTurnStart(compose("d6pool", []).definition as D6TurnSystem, 0)).toEqual({ pool: 1, log: ["base"] });
  });

  it("ext data of the module lives beside the base data and survives base writes", () => {
    const slot = D6POOL_PLUS_SLOT.write({ focus: 2 }, D6POOL_SLOT.write({ pool: 4 }));

    expect(slot).toEqual({ key: "d6pool", data: { pool: 4, ext: { "d6pool-plus": { focus: 2 } } } });
    expect(D6POOL_PLUS_SLOT.read(slot)).toEqual({ focus: 2 });
    expect(D6POOL_SLOT.read(slot)?.pool).toBe(4);
    expect(D6POOL_SLOT.write({ pool: 5 }, slot).data).toEqual({ pool: 5, ext: { "d6pool-plus": { focus: 2 } } });
    expect(D6POOL_PLUS_SLOT.read(D6POOL_SLOT.write({ pool: 1 }))).toBeUndefined();
  });

  it("d6pool + plus + alt is rejected: the shared claim and the declared conflict", () => {
    expect(validateComposition({ key: "d6pool", modules: ["d6pool-plus", "d6pool-alt"] }, FIXTURE_METAS).map((i) => i.code).sort()).toEqual(["conflict", "duplicateClaim"]);
  });

  it("without a declared conflict the double claim is still a duplicateClaim issue", () => {
    const metas = [D6POOL_META, D6POOL_PLUS_META, D6POOL_ALT_META];

    expect(validateComposition({ key: "d6pool", modules: ["d6pool-plus", "d6pool-alt"] }, metas)).toEqual([{ code: "duplicateClaim", module: "turn.order", detail: "d6pool-alt,d6pool-plus" }]);
  });

  it("alt replaces the claimed slot and delegates to prev", () => {
    expect((compose("d6pool", ["d6pool-alt"]).definition as D6TurnSystem).turn.order(["a", "b"])).toEqual(["b", "a"]);
  });

  it("replacing a slot without a claim throws in the composer", () => {
    expect(() => composeParts(D6POOL_TURN_SYSTEM, [{ id: "d6pool-alt", build: D6POOL_ALT_MODULE }], SYSTEM_FIELD_KINDS)).toThrow(/without a claim/);
  });

  it("two modules adding the same ui section collide", () => {
    expect(() => composeUi(D6POOL_UI, [{ id: "a", build: D6POOL_PLUS_UI }, { id: "b", build: D6POOL_PLUS_UI }])).toThrow(/duplicate key/);
  });
});
