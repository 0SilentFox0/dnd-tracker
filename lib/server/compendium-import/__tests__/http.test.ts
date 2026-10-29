import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), preview: vi.fn(), confirm: vi.fn(), authorize: vi.fn(), runs: vi.fn(), entry: vi.fn(), rate: vi.fn() }));

vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: mocks.actor }));
vi.mock("../presentation", () => ({ previewPresentation: () => ({ graph: [], rulesDiff: {} }), importTargetOptions: vi.fn(), mediaPresentation: (r: unknown) => r }));
vi.mock("../repository", () => ({ prismaImportRepository: { authorize: mocks.authorize } }));
vi.mock("@/lib/i18n/request-locale", () => ({ getRequestLocale: async () => "uk" }));
vi.mock("../service", () => ({ previewImport: mocks.preview, confirmImport: mocks.confirm }));
vi.mock("@/lib/db", () => ({ prisma: { compendiumImportRun: { findMany: mocks.runs }, compendiumEntry: { findMany: mocks.entry } } }));
vi.mock("@/lib/utils/api/rate-limit", () => ({ checkRateLimit: mocks.rate, rateLimitResponse: () => NextResponse.json({}, { status: 429 }) }));
import { compendiumRoute } from "../http";
import { COMPENDIUM_LIMITS } from "../parse";

const ctx = { params: Promise.resolve({ id: "c" }) };

const req = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/campaigns/c/compendium/preview", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => { vi.clearAllMocks(); mocks.actor.mockResolvedValue({ campaignId: "c", userId: "u", isDM: true, via: "session" }); mocks.rate.mockResolvedValue({ allowed: true }); process.env.COMPENDIUM_PREVIEW_SECRET = "s".repeat(32); });
describe("compendium HTTP boundary", () => {
  it("rejects foreign origin before planning", async () => { expect((await compendiumRoute("preview")(req({}, "https://evil.test"), ctx)).status).toBe(403); expect(mocks.preview).not.toHaveBeenCalled(); });
  it("rejects token actors including DM tokens", async () => { mocks.actor.mockResolvedValue({ isDM: true, via: "token" }); expect((await compendiumRoute("preview")(req({}), ctx)).status).toBe(403); });
  it("preserves auth failures for reads", async () => { mocks.actor.mockResolvedValue(NextResponse.json({}, { status: 401 })); expect((await compendiumRoute("reports")(new Request("http://localhost/api"), ctx)).status).toBe(401); expect(mocks.runs).not.toHaveBeenCalled(); });
  it("previews with the existing service and never confirms", async () => { mocks.preview.mockResolvedValue({ token: "t", report: { rows: [], nextActions: [] } });

 const response = await compendiumRoute("preview")(req({ input: { json: "{}" } }), ctx);

 expect(response.status).toBe(200); expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "c" }), { json: "{}" }, "s".repeat(32), expect.anything()); expect(mocks.confirm).not.toHaveBeenCalled(); expect(response.headers.get("cache-control")).toContain("no-store"); });
  it("bounds streaming request bodies and fails closed without secret", async () => { delete process.env.COMPENDIUM_PREVIEW_SECRET; expect((await compendiumRoute("preview")(req({}), ctx)).status).toBe(503); expect(mocks.preview).not.toHaveBeenCalled(); });
  it("returns sanitized stale errors without payload", async () => { const { CompendiumError } = await import("../parse");

 mocks.confirm.mockRejectedValue(new CompendiumError("PREVIEW_STALE", "private payload"));

 const response = await compendiumRoute("confirm")(req({ input: { json: "secret" }, token: "t", idempotencyKey: "key", rightsConfirmed: true }), ctx);

 expect(response.status).toBe(409); expect(await response.text()).not.toContain("private payload"); });
  it("requires rights confirmation", async () => { expect((await compendiumRoute("confirm")(req({ input: {}, token: "t", idempotencyKey: "k" }), ctx)).status).toBe(422); expect(mocks.confirm).not.toHaveBeenCalled(); });
  it("loads campaign-scoped paginated reports after refresh", async () => { mocks.runs.mockResolvedValue([]);

 const response = await compendiumRoute("reports")(new Request("http://localhost/api?offset=20"), ctx);

 expect(response.status).toBe(200); expect(mocks.authorize).toHaveBeenCalled(); expect(mocks.runs).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "c" }, skip: 20, take: 21 })); });
});
it("rejects oversized transport before parsing or planning", async () => {
 const request = req({ input: { json: "{}" } });

 request.headers.set("content-length", "3000001");
 expect((await compendiumRoute("preview")(request, ctx)).status).toBe(413); expect(mocks.preview).not.toHaveBeenCalled();
});

it.each([0, 1])("bounds actual streamed UTF8 bytes without content-length (over: %s)", async (over) => {
  const body = JSON.stringify({ input: { json: "{}" } });

  const bytes = new TextEncoder().encode(body + " ".repeat(COMPENDIUM_LIMITS.requestBytes - body.length + over));

  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(bytes.slice(0, 123));
    controller.enqueue(bytes.slice(123));
    controller.close();
  } });

  const request = new Request("http://localhost/api", { method: "POST", headers: { origin: "http://localhost" }, body: stream, duplex: "half" } as RequestInit);

  mocks.preview.mockResolvedValue({ token: "t", report: { rows: [], nextActions: [] } });

  const response = await compendiumRoute("preview")(request, ctx);

  expect(response.status).toBe(over ? 413 : 200);

  if (over) {
    expect(await response.json()).toEqual({ code: "REQUEST_SIZE" });
    expect(mocks.preview).not.toHaveBeenCalled();
  } else expect(mocks.preview).toHaveBeenCalledOnce();

  expect(mocks.confirm).not.toHaveBeenCalled();
});

it("rejects invalid transport UTF8 before planning", async () => {
  const request = new Request("http://localhost/api", { method: "POST", headers: { origin: "http://localhost" }, body: new Uint8Array([0xff]) });

  const response = await compendiumRoute("preview")(request, ctx);

  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ code: "INVALID_INPUT" });
  expect(mocks.preview).not.toHaveBeenCalled();
  expect(mocks.confirm).not.toHaveBeenCalled();
});
it("scopes source notes to the authorized campaign and exact native target", async () => {
 mocks.entry.mockResolvedValue([]);
 expect((await compendiumRoute("entries")(new Request("http://localhost/api?kind=spells&targetId=s"), ctx)).status).toBe(200);
 expect(mocks.entry).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "c", kind: "spells", localId: "s" } }));
});

it("accepts the browser host when Next normalizes the internal request URL", async () => {
  mocks.preview.mockResolvedValue({ token: "t", report: { rows: [], nextActions: [] } });

  const request = req({ input: { json: "{}" } }, "http://127.0.0.1:3133");

  request.headers.set("host", "127.0.0.1:3133");
  expect((await compendiumRoute("preview")(request, ctx)).status).toBe(200);
});

it("rejects a foreign origin even with a normalized internal URL", async () => {
  const request = req({ input: { json: "{}" } }, "https://evil.test");

  request.headers.set("host", "127.0.0.1:3133");
  expect((await compendiumRoute("preview")(request, ctx)).status).toBe(403);
});
