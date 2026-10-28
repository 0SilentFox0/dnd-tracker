import { describe, expect, it } from "vitest";
import { z } from "zod";

import { hasScope } from "@/lib/constants/ai";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { confirmationFor } from "@/lib/server/assistant/policy";
import type { ActionPreview, AssistantActionDef } from "@/lib/server/assistant/types";

const preview: ActionPreview = { summary: "Змінити героя", targets: [], changes: [], warnings: [], preconditions: null, effects: [] };

const action: AssistantActionDef = {
  id: "characters.update", title: "Змінити героя", description: "Змінює героя чинним сервісом кампанії.", input: z.object({}),
  need: { access: "dm", scope: "characters:write" }, effect: "write", confirmation: "standard",
  prepare: async () => preview, execute: async () => ({ data: null, affected: [], warnings: [] }),
};

describe("assistant confirmation policy", () => {
  it("requires review by default and permits ordinary auto changes", () => {
    expect(confirmationFor(action, "review", preview)).toBe("human");
    expect(confirmationFor(action, "auto", preview)).toBe("none");
  });

  it.each(["delete", "erase-progress", "change-access"] as const)("auto cannot bypass nested %s effects", (kind) => {
    expect(confirmationFor(action, "auto", { ...preview, effects: [{ kind, targets: [], description: "Незворотний ефект" }] })).toBe("human");
  });

  it("never auto-executes session-only or explicitly protected operations", () => {
    expect(confirmationFor({ ...action, need: { ...action.need, sessionOnly: true } }, "auto", preview)).toBe("human");
    expect(confirmationFor({ ...action, confirmation: "always" }, "auto", preview)).toBe("human");
  });

  it("fails closed on an invalid mode or incomplete preview", () => {
    expect(() => confirmationFor(action, "autoo" as "auto", preview)).toThrow();
    expect(() => confirmationFor(action, "auto", { ...preview, effects: undefined } as never)).toThrow();
  });

  it.each([
    ["content:write", "content:read", true], ["characters:write", "characters:read", true],
    ["battles:write", "battles:read", true], ["show:write", "show:read", true],
    ["campaign:write", "campaign:read", true], ["scenario:write", "scenario:read", true],
    ["characters:write", "battles:read", false], ["ai", "battles:write", false],
    ["content:write", "characters:write", false], ["battles:read", "battles:write", false],
  ] as const)("%s implies %s only when allowed", (given, need, allowed) => {
    expect(hasScope([given], need)).toBe(allowed);
  });
});

describe("assistant action catalog", () => {
  const dm = { campaignId: "campaign", userId: "dm", isDM: true, via: "session", scopes: null } as const;

  it("unknown operations fail closed; duplicates are not silently overwritten", () => {
    const catalog = createActionCatalog([action]);

    expect(() => catalog.getAction("characters.delete-all")).toThrow();
    expect(() => createActionCatalog([action, action])).toThrow();
    expect(catalog.getAction("characters.update").id).toBe("characters.update");
  });

  it("legacy ai and foreign scopes do not expose newly privileged operations", () => {
    const catalog = createActionCatalog([action]);

    expect(catalog.listActions({ ...dm, via: "token", scopes: ["ai"] })).toEqual([]);
    expect(catalog.listActions({ ...dm, via: "token", scopes: ["battles:write"] })).toEqual([]);
    expect(catalog.listActions({ ...dm, via: "token", scopes: ["characters:write"] }).map((a) => a.id)).toEqual(["characters.update"]);
    expect(catalog.listActions({ ...dm, isDM: false })).toEqual([]);
  });

  it("lists session-only preparation without granting direct execution", () => {
    const catalog = createActionCatalog([{ ...action, need: { ...action.need, sessionOnly: true } }]);

    expect(catalog.listActions({ ...dm, via: "token", scopes: ["characters:write"] }).map((a) => a.id)).toEqual(["characters.update"]);
  });
});
