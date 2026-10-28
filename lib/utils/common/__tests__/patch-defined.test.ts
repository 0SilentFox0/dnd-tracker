import { describe, expect, it } from "vitest";

import { patchDefined } from "@/lib/utils/common/patch-defined";

describe("patchDefined", () => {
  it("drops patched keys that are undefined", () => {
    expect(patchDefined({ a: 1, b: 2 } as { a?: number; b?: number }, { a: undefined, b: 3 })).toEqual({ b: 3 });
  });

  it("uses a custom emptiness check and leaves untouched keys alone", () => {
    const isEmpty = (v: unknown) => Array.isArray(v) && v.length === 0;

    expect(patchDefined({ k: [] as string[], x: [] as string[] }, { x: [] }, isEmpty)).toEqual({ k: [] });
  });
});
