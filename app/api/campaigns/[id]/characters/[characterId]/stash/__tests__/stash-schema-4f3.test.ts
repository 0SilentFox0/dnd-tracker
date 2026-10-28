import { describe, expect, it } from "vitest";

import { stashActionSchema } from "../stash-schema";

describe("stash schema 4f-3", () => {
  it("accepts refs, grant with base/quantity, attune/unattune", () => {
    expect(stashActionSchema.safeParse({ action: "equip", artifactId: "cl1+cp2" }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "revoke", artifactId: "cl1+cp2" }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "grant", artifactId: "cp2", baseId: "cl1" }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "grant", artifactId: "pot", quantity: 2 }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "attune", ref: "cl1+cp2" }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "unattune", ref: "ring-a" }).success).toBe(true);
  });

  it("rejects malformed refs and quantities", () => {
    expect(stashActionSchema.safeParse({ action: "equip", artifactId: "a+b+c" }).success).toBe(false);
    expect(stashActionSchema.safeParse({ action: "attune", ref: "a b" }).success).toBe(false);
    expect(stashActionSchema.safeParse({ action: "grant", artifactId: "pot", quantity: 0 }).success).toBe(false);
    expect(stashActionSchema.safeParse({ action: "grant", artifactId: "pot", quantity: 100 }).success).toBe(false);
  });
});
