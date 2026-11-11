import { describe, expect, it } from "vitest";

import { defineSlot } from "../slot";

const codec = defineSlot<{ n: number }>("sys", (raw) => (typeof (raw as { n?: unknown })?.n === "number" ? (raw as { n: number }) : undefined));

describe("defineSlot", () => {
  it("reads own key", () => expect(codec.read({ key: "sys", data: { n: 1 } })).toEqual({ n: 1 }));

  it("returns undefined for a foreign key", () => expect(codec.read({ key: "other", data: { n: 1 } })).toBeUndefined());

  it("returns undefined when parse rejects", () => expect(codec.read({ key: "sys", data: { n: "x" } })).toBeUndefined());

  it("returns undefined for a missing slot", () => {
    expect(codec.read(undefined)).toBeUndefined();
    expect(codec.read(null)).toBeUndefined();
  });

  it("write wraps data with the key", () => expect(codec.write({ n: 2 })).toEqual({ key: "sys", data: { n: 2 } }));
});
