import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { composeServer } from "../compose";
import type { SystemOperation, SystemServer } from "../types";

import { CompositionError } from "@/lib/utils/rules/systems/compose";

const op = (): SystemOperation => ({ operation: vi.fn() as never, input: z.object({}) });

const base: SystemServer = { schemas: {}, operations: { rest: op() }, ai: { promptLine: "base", toolNotes: { get_party: "a" }, heroSelect: { hp: true } } };

describe("composeServer", () => {
  it("merges operations, toolNotes and heroSelect dictionaries of addons", () => {
    const added = op();

    const out = composeServer(base, [{ id: "m", build: () => ({ operations: { fly: added }, ai: { toolNotes: { read_character: "b" }, heroSelect: { mana: true } } }) }]);

    expect(Object.keys(out.operations ?? {})).toEqual(["rest", "fly"]);
    expect(out.operations?.fly).toBe(added);
    expect(out.ai?.toolNotes).toEqual({ get_party: "a", read_character: "b" });
    expect(out.ai?.heroSelect).toEqual({ hp: true, mana: true });
  });

  it("throws on a duplicate key in an operations or toolNotes dictionary", () => {
    expect(() => composeServer(base, [{ id: "m", build: () => ({ operations: { rest: op() } }) }])).toThrow(CompositionError);
    expect(() => composeServer(base, [{ id: "m", build: () => ({ ai: { toolNotes: { get_party: "x" } } }) }])).toThrow(/duplicate key "get_party" in ai.toolNotes/);
  });

  it("rejects replacing a value without a claim and hands the claimant prev", () => {
    expect(() => composeServer(base, [{ id: "m", build: () => ({ ai: { promptLine: "m" } }) }])).toThrow(/without a claim/);

    const out = composeServer(base, [{ id: "m", claims: ["ai.promptLine"], build: (prev) => ({ ai: { promptLine: `${prev.ai?.promptLine}+m` } }) }]);

    expect(out.ai?.promptLine).toBe("base+m");
  });

  it("does not mutate the base", () => {
    composeServer(base, [{ id: "m", build: () => ({ operations: { fly: op() } }) }]);

    expect(Object.keys(base.operations ?? {})).toEqual(["rest"]);
  });
});
