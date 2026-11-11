import { expect } from "vitest";

import { assertSystemContract } from "./system-contract";

import type { SystemUi } from "@/components/systems/types";
import type { SystemServer } from "@/lib/server/systems/types";
import { type Composition, kindOf, moduleMetaOf, presetsOf } from "@/lib/utils/rules/systems/catalog";
import { validateComposition } from "@/lib/utils/rules/systems/compose";
import type { SystemMeta } from "@/lib/utils/rules/systems/meta";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

type Metas = readonly SystemMeta[];

export interface Composed {
  definition: RuleSystemDefinition;
  ui: SystemUi;
  server: SystemServer;
}

export type ComposeFn = (key: string, modules: readonly string[] | undefined) => Composed;

export interface MatrixCase {
  label: string;
  key: string;
  base: string;
  modules: readonly string[] | undefined;
}

const cycleOf = (metas: Metas): string | undefined => {
  const state = new Map<string, "open" | "done">();

  const visit = (id: string, trail: string[]): string | undefined => {
    if (state.get(id) === "done") return undefined;

    if (state.get(id) === "open") return [...trail, id].join(" -> ");

    state.set(id, "open");

    for (const req of moduleMetaOf(id, metas)?.requires ?? []) {
      const found = visit(req, [...trail, id]);

      if (found) return found;
    }

    state.set(id, "done");

    return undefined;
  };

  for (const meta of metas) {
    const found = visit(meta.module, []);

    if (found) return found;
  }

  return undefined;
};

/** Contract graph rules of spec 5.6 (requires, same claims declared in conflicts, presets); returns the violations */
export function graphViolations(metas: Metas): string[] {
  const out: string[] = [];

  for (const meta of metas) {
    for (const id of [...(meta.requires ?? []), ...(meta.conflicts ?? []), ...(meta.after ?? [])]) {
      if (!moduleMetaOf(id, metas)) out.push(`${meta.module}: references unknown module ${id}`);
    }

    if (kindOf(meta) === "preset") {
      if (!meta.preset) out.push(`${meta.module}: preset without composition`);
    }
  }

  const cycle = cycleOf(metas);

  if (cycle) out.push(`requires cycle: ${cycle}`);

  const addons = metas.filter((m) => kindOf(m) === "addon");

  for (const [i, a] of addons.entries()) {
    for (const b of addons.slice(i + 1)) {
      const shared = (a.claims ?? []).find((c) => (b.claims ?? []).includes(c));

      const declared = (a.conflicts ?? []).includes(b.module) || (b.conflicts ?? []).includes(a.module);

      if (shared && !declared) out.push(`${a.module} and ${b.module} both claim ${shared} without a declared conflict`);
    }
  }

  for (const [key, preset] of Object.entries(presetsOf(metas))) {
    const issues = validateComposition({ key }, metas);

    if (issues.length > 0) out.push(`preset ${key} (${preset.base}+${preset.modules.join(",")}): ${issues.map((i) => i.code).join(",")}`);
  }

  return out;
}

const basesOf = (meta: SystemMeta, metas: Metas): string[] => (meta.requires ?? []).filter((r) => {
  const required = moduleMetaOf(r, metas);

  return !!required && kindOf(required) === "base";
});

const closure = (id: string, metas: Metas, into = new Set<string>()): Set<string> => {
  if (into.has(id)) return into;

  into.add(id);

  for (const req of moduleMetaOf(id, metas)?.requires ?? []) {
    const required = moduleMetaOf(req, metas);

    if (required && kindOf(required) === "addon") closure(req, metas, into);
  }

  return into;
};

/** Every base alone, every preset, every add-on alone on each compatible base, and the full compatible set per base */
export function matrixCases(metas: Metas): MatrixCase[] {
  const cases: MatrixCase[] = [];

  const presets: Record<string, Composition> = presetsOf(metas);

  for (const [key, preset] of Object.entries(presets)) {
    cases.push({ label: `preset ${key}`, key, base: preset.base, modules: undefined });
  }

  const addons = metas.filter((m) => kindOf(m) === "addon");

  for (const base of metas.filter((m) => kindOf(m) === "base")) {
    for (const key of base.keys) {
      cases.push({ label: `base ${base.module} (${key}) alone`, key, base: base.module, modules: [] });

      const compatible = addons.filter((a) => {
        const bases = basesOf(a, metas);

        return bases.length === 0 || bases.includes(base.module);
      });

      let full: string[] = [];

      for (const addon of compatible) {
        const modules = [...closure(addon.module, metas)].sort();

        if (validateComposition({ key, modules }, metas).length === 0) cases.push({ label: `${addon.module} on ${key}`, key, base: base.module, modules });

        const grown = [...new Set([...full, ...modules])].sort();

        if (validateComposition({ key, modules: grown }, metas).length === 0) full = grown;
      }

      if (full.length > 1) cases.push({ label: `all compatible modules on ${key}`, key, base: base.module, modules: full });
    }
  }

  return cases;
}

export function assertMatrixCase(metas: Metas, c: MatrixCase, compose: ComposeFn): void {
  expect(validateComposition({ key: c.key, modules: c.modules }, metas), c.label).toEqual([]);

  const baseMeta = (metas.find((m) => m.keys.includes(c.key)) ?? moduleMetaOf(c.base, metas)) as SystemMeta;

  const { definition, ui, server } = compose(c.key, c.modules);

  assertSystemContract(baseMeta, definition, ui, server);
}
