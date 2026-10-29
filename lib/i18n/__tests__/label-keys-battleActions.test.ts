import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { expectLabelKeys } from "../test/label-keys";
import { textOf } from "../test/text";

import { LOCALES } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { legendaryBadge } from "@/lib/utils/battle/actions/legendary-options";
import { ACTION_REASONS, actionReason } from "@/lib/utils/battle/actions/reasons";
import { CONDITION_5E_KEYS } from "@/lib/utils/battle/conditions/registry";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";

const lookup = (tree: Record<string, unknown>, path: string) => path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);

const SPELL_TARGET_KEYS = ["pickPoint", "pointOutOfMap", "pointOutOfRange", "pickDirection", "noTargets", "targetMissing", "targetOutOfRange", "noFallen", "pickOneFallen", "mustBeFallen", "pickTarget", "mustBeAlly", "mustBeEnemy", "pickChainFirst", "tooMany", "charmerHostile"];

const mazeKeys = (value: unknown): string[] => {
  if (typeof value === "string") return [value];

  if (value && typeof value === "object" && "message" in value) return [(value as { message: string }).message];

  return typeof value === "object" && value ? Object.values(value).flatMap(mazeKeys) : [];
};

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sources(path);

    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("battleActions has translations", () => {
  expectLabelKeys("battleActions", "reject", ACTION_REASONS);
  expectLabelKeys("battleActions", "spell.target", SPELL_TARGET_KEYS);
  expectLabelKeys("battleActions", "condition.lower", CONDITION_5E_KEYS);

  it("every MAZE_TEXTS entry exists in every locale", async () => {
    const keys = Object.values(MAZE_TEXTS).filter((v) => typeof v !== "function").flatMap(mazeKeys);

    expect(keys.length).toBeGreaterThan(25);

    for (const locale of LOCALES) {
      const tree = await localSource.load(locale, "battleActions");

      for (const key of keys) expect(typeof lookup(tree, key.replace("battleActions.", "")), `${locale}: ${key}`).toBe("string");
    }
  });

  it("every battleActions key written in the engine exists in every locale", async () => {
    const used = new Set(["lib/utils/battle"].flatMap(sources).flatMap((file) => readFileSync(file, "utf8").match(/"battleActions\.[A-Za-z0-9_.]+[A-Za-z0-9_]"/g) ?? []).map((key) => key.slice(1, -1)));

    expect(used.size).toBeGreaterThan(60);

    for (const locale of LOCALES) {
      const tree = await localSource.load(locale, "battleActions");

      for (const key of used) expect(typeof lookup(tree, key.replace("battleActions.", "")), `${locale}: ${key}`).toBe("string");
    }
  });

  it("renders the same line in uk and en with real catalogs", () => {
    expect(textOf(actionReason("legendaryShort", { left: 1, cost: 2 }), "uk")).toBe("Не вистачає легендарних дій (1 з 2)");
    expect(textOf(actionReason("legendaryShort", { left: 1, cost: 2 }), "en")).toBe("Not enough legendary actions (1 of 2)");
    expect(textOf(MAZE_TEXTS.escaped("Ann"), "en")).toBe("Ann escaped from the maze");
    expect(textOf(MAZE_TEXTS.tunnelTooShort(3), "en")).toBe("The tunnel from the centre to the edge cannot fit 3 heroes");
  });

  it("the legendary badge joins its parts", () => {
    const p = createMockParticipant();

    const badge = legendaryBadge({ ...p, battleData: { ...p.battleData, legendary: { actions: 3, actionsLeft: 1, resistLeft: 1 } } });

    expect(textOf(badge!, "en")).toBe("Leg. actions 1/3 · Leg. resist 1");
  });
});
