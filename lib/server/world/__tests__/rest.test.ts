import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentError } from "@/lib/server/content/errors";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";

const restParty = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/characters/core/rest-handler", () => ({ restParty }));

import { applyWorldRest } from "../rest";

const accessWith = (persistResources: boolean) => ({ campaign: { rules: { outOfCombat: { persistResources } } } }) as unknown as CampaignAccessResult;

describe("applyWorldRest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("не відпочиває, коли persistResources вимкнено", async () => {
    await expect(applyWorldRest(accessWith(false), "long", ["a"])).resolves.toEqual({ applied: false });
    expect(restParty).not.toHaveBeenCalled();
  });

  it("не відпочиває при none", async () => {
    await expect(applyWorldRest(accessWith(true), "none", ["a"])).resolves.toEqual({ applied: false });
    expect(restParty).not.toHaveBeenCalled();
  });

  it("викликає restParty, коли persistResources увімкнено", async () => {
    const access = accessWith(true);

    await expect(applyWorldRest(access, "short", ["a", "b"])).resolves.toEqual({ applied: true });
    expect(restParty).toHaveBeenCalledExactlyOnceWith(access, { kind: "short", characterIds: ["a", "b"] });
  });

  it("пробиває помилку restParty", async () => {
    restParty.mockRejectedValue(new ContentError("busy", 409));

    await expect(applyWorldRest(accessWith(true), "long", ["a"])).rejects.toMatchObject({ status: 409 });
  });
});
