import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/campaigns/rules", () => ({ readCampaignRules: vi.fn(), updateCampaignRules: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/utils/api/actor", async (original) => ({ ...(await original<object>()), resolveActor: vi.fn(async () => ({ campaignId: "c", userId: "u", isDM: true, via: "session", scopes: null })) }));
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: () => Promise<unknown>) => fn() }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { runContentOperation } from "@/lib/server/content/operation-service";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import type { Actor } from "@/lib/utils/api/actor";
import { operationRoute } from "@/lib/utils/api/content-routes";

const actor: Actor = { campaignId: "c", userId: "u", isDM: true, via: "session", scopes: null };

const rulesBody = {};

describe("content operation parse cost", () => {
  it("rules.update: no explicit body.parse inside runContentOperation", async () => {
    const parse = vi.spyOn(CONTENT_OPERATIONS["rules.update"].body, "parse");

    await runContentOperation("rules.update", actor, { body: rulesBody });

    expect(parse).not.toHaveBeenCalled();
    parse.mockRestore();
  });

  it("rules.update over HTTP: body validated once by parseBody", async () => {
    const safeParse = vi.spyOn(CONTENT_OPERATIONS["rules.update"].body, "safeParse");

    const parse = vi.spyOn(CONTENT_OPERATIONS["rules.update"].body, "parse");

    const route = operationRoute(CONTENT_OPERATIONS["rules.update"], async ({ actor: a, body }) => NextResponse.json(await runContentOperation("rules.update", a, { body })));

    const res = await route(new Request("http://x", { method: "PATCH", body: JSON.stringify(rulesBody) }), { params: Promise.resolve({ id: "c" }) });

    expect(res.status).toBe(200);
    expect(safeParse.mock.calls.length + parse.mock.calls.length).toBe(1);
    safeParse.mockRestore();
    parse.mockRestore();
  });

  it("invalid body keeps the same 400 text", async () => {
    const error = await runContentOperation("rules.update", actor, { body: { editions: 1 } }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ContentError);
    expect(error).toMatchObject({ status: 400, message: API_ERRORS.INVALID_BODY });
  });

  it("bench: 1000 rules.update runs", async () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) await runContentOperation("rules.update", actor, { body: rulesBody });

    const ms = performance.now() - start;

    console.info(`rules.update x1000: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(10_000);
  });
});
