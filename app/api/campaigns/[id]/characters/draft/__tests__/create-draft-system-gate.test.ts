import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("../create-wfrp-draft", () => ({ createWfrpDraft: vi.fn(async () => NextResponse.json({ wfrp: true })) }));

import { createDraft } from "../create-draft";
import { createWfrpDraft } from "../create-wfrp-draft";

import * as apiAuth from "@/lib/utils/api/api-auth";

const as = (rules: object) => vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "u1", campaign: { rules, members: [] } } as never);

const post = () => createDraft(new Request("http://x", { method: "POST", body: "{}" }), "c1");

describe("createDraft system dispatch", () => {
  it("wfrp campaigns go to the wfrp handler", async () => {
    as(WFRP_RULES);

    expect((await (await post()).json())).toEqual({ wfrp: true });
    expect(createWfrpDraft).toHaveBeenCalled();
  });

  it("a non-d20 system without creation -> 409", async () => {
    as({ ...DEFAULT_RULES, system: { ...DEFAULT_RULES.system, key: "stub" } });

    const { RULE_SYSTEM_REGISTRY } = await import("@/lib/utils/rules/systems/registry");

    (RULE_SYSTEM_REGISTRY as Record<string, unknown>).stub = { ...RULE_SYSTEM_REGISTRY.wfrp, creation: undefined };

    const res = await post();

    delete (RULE_SYSTEM_REGISTRY as Record<string, unknown>).stub;
    expect(res.status).toBe(409);
  });
});
