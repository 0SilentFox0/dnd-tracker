import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { createBackgroundSchema, updateBackgroundSchema } from "@/lib/schemas/backgrounds";
import { createClassSchema, updateClassSchema } from "@/lib/schemas/classes";
import { createFeatSchema, updateFeatSchema } from "@/lib/schemas/feats";
import { createContentActions } from "@/lib/server/assistant/actions/content";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { NEED, needFailure } from "@/lib/utils/api/need";

describe("constructor content schema identity", () => {
  const catalog = createActionCatalog(createContentActions());

  it.each([
    ["classes", createClassSchema, updateClassSchema],
    ["feats", createFeatSchema, updateFeatSchema],
    ["backgrounds", createBackgroundSchema, updateBackgroundSchema],
  ] as const)("%s uses canonical validators inside assistant create/update envelopes", (kind, create, update) => {
    const resource = CONTENT_RESOURCES[kind];

    expect(resource.schemas.create).toBe(create);
    expect(resource.schemas.update).toBe(update);
    expect((catalog.getAction(`content.${kind}.create`).input as z.ZodObject).shape.data).toBe(create);
    expect((catalog.getAction(`content.${kind}.update`).input as z.ZodObject).shape.patch).toBe(update);
  });

  it.each(["classes", "feats", "backgrounds"] as const)("%s independently rejects invalid choice IDs and empty spell refs at both boundaries", (kind) => {
   for (const invalid of ["choice-id", "spell-id"]) {
    const badChoice = { id: invalid === "choice-id" ? "bad id!" : "gift", label: "Gift", kind: "option", options: [{ id: "a", name: "A", spells: [{ level: 1, spellId: invalid === "spell-id" ? "" : "local-spell" }] }] };

    const patch = kind === "classes" ? { features: [{ level: 1, abilities: [], choices: [badChoice] }] } : { choices: [badChoice] };

    for (const [op, body] of [["create", { name: "Test", ...patch }], ["update", patch]] as const) {
      const direct = CONTENT_RESOURCES[kind].schemas[op].safeParse(body);

      const wrapped = catalog.getAction(`content.${kind}.${op}`).input.safeParse(op === "create" ? { data: body } : { id: "local", patch: body });

      expect(direct.success).toBe(false);
      expect(wrapped.success).toBe(false);

      if (!direct.success && !wrapped.success) expect(wrapped.error.issues.map(i => ({ ...i, path: i.path.slice(1) }))).toEqual(direct.error.issues);
    }
   }
  });

  it("bulk delete retains sessionOnly even though tokens can prepare a review", () => {
    const action = catalog.getAction("content.units.delete-all");

    expect(action.need).toEqual(NEED.writeAll);
    expect(needFailure({ isDM: true, via: "token", scopes: ["content:write"] }, action.need)).toBeTruthy();
    expect(needFailure({ isDM: true, via: "session", scopes: null }, action.need)).toBeNull();
  });
});
