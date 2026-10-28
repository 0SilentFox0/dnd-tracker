import { describe, expect, it } from "vitest";

import { jsonContent as compatibilityJson, snapshotHash } from "@/lib/server/assistant/actions/content-snapshot";
import { requestDigest } from "@/lib/server/assistant/json";
import { jsonContent } from "@/lib/server/assistant/json";

const legacy = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));

describe("compatible assistant JSON normalization", () => {
  const matrix: unknown[] = [
    undefined, null, true, 0, -0, "Привіт 🌻 e\u0301", new Date("2026-10-26T12:00:00.000Z"), new Date(NaN),
    { z: 1, a: undefined, nested: [undefined, null, { text: "Їжак", x: [1, 2] }] },
    [undefined, , NaN, Infinity, -Infinity, () => 1, Symbol("ignored")],
    { z: 1, "10": "ten", "2": "two", a: 2 }, new Map([["a", 1]]), new Set([1]),
    { toJSON: () => ({ b: "custom", a: null }) },
  ];

  it.each(matrix.map((value, index) => ({ value, index })))("keepsJsonRoundtripAndDigest case $index", ({ value }) => {
    const expected = legacy(value);

    expect(jsonContent(value)).toEqual(expected);
    expect(JSON.stringify(jsonContent(value))).toBe(JSON.stringify(expected));
    expect(requestDigest(jsonContent(value))).toBe(requestDigest(expected));
    expect(snapshotHash(value)).toBe(requestDigest(expected));
    expect(compatibilityJson(value)).toEqual(expected);
  });

  it("preserves insertion order in JSON and canonical order in digests", () => {
    expect(JSON.stringify(jsonContent({ z: 1, a: 2 }))).toBe('{"z":1,"a":2}');
    expect(snapshotHash({ z: 1, a: 2 })).toBe(snapshotHash({ a: 2, z: 1 }));
  });

  it("preserves the current TypeError for BigInt and cyclic objects", () => {
    const cycle: Record<string, unknown> = {};

    cycle.self = cycle;

    for (const value of [BigInt(1), { value: BigInt(1) }, cycle]) {
      expect(() => legacy(value)).toThrow(TypeError);
      expect(() => jsonContent(value)).toThrow(TypeError);
    }
  });

  it("preserves SyntaxError for unsupported root values and undefined toJSON", () => {
    for (const value of [() => 1, Symbol("unsupported"), { toJSON: () => undefined }]) {
      expect(() => legacy(value)).toThrow(SyntaxError);
      expect(() => jsonContent(value)).toThrow(SyntaxError);
    }
  });
});
