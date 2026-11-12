import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { assertEffectsInComposition } from "@/lib/server/content/traits-guard";
import { ownershipOf } from "@/lib/utils/abilities/registry/effects/ownership";

const own = ownershipOf([], { moraleChance: "morale" });

const ability = (effect: { kind: string; [k: string]: unknown }) => [{ effects: [effect] }];

const morale = ability({ kind: "flag", flag: "moraleChance", value: 10 });

describe("assertEffectsInComposition", () => {
  it("rejects a wfrp effect in dnd5e with 422", () => {
    expect(() => assertEffectsInComposition({ key: "dnd5e" }, ability({ kind: "wfrpWard", value: 9 }))).toThrowError(expect.objectContaining({ message: API_ERRORS.EFFECT_OUTSIDE_COMPOSITION, status: 422 }));
  });

  it("accepts a wfrp effect in wfrp and a core effect anywhere", () => {
    expect(() => assertEffectsInComposition({ key: "wfrp" }, ability({ kind: "wfrpWard", value: 9 }))).not.toThrow();
    expect(() => assertEffectsInComposition({ key: "dnd5e" }, ability({ kind: "heal" }))).not.toThrow();
  });

  it("morale flag passes in dnd5e + morale", () => {
    expect(() => assertEffectsInComposition({ key: "dnd5e", modules: ["morale"] }, morale, own)).not.toThrow();
  });

  it("morale flag in bare dnd5e → 422", () => {
    expect(() => assertEffectsInComposition({ key: "dnd5e", modules: [] }, morale, own)).toThrowError(expect.objectContaining({ status: 422 }));
  });

  it("looks inside randomOf options", () => {
    expect(() => assertEffectsInComposition({ key: "dnd5e" }, ability({ kind: "randomOf", options: [{ kind: "wfrpWard", value: 9 }] }))).toThrowError(expect.objectContaining({ status: 422 }));
  });

  it("real registry: morale flag needs the morale module", () => {
    expect(() => assertEffectsInComposition({ key: "dnd5e" }, morale)).toThrowError(expect.objectContaining({ status: 422 }));
    expect(() => assertEffectsInComposition({ key: "dnd5e", modules: ["morale"] }, morale)).not.toThrow();
    expect(() => assertEffectsInComposition({ key: "homm" }, morale)).not.toThrow();
  });

  it("real registry: d20 proficiency flags are rejected outside a d20 base", () => {
    expect(() => assertEffectsInComposition({ key: "wfrp" }, ability({ kind: "flag", flag: "saveProficiency", abilities: ["wisdom"] }))).toThrowError(expect.objectContaining({ status: 422 }));
  });
});
