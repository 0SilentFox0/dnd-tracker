import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

const state = vi.hoisted(() => ({ actor: null as unknown }));

const generateObject = vi.hoisted(() => vi.fn());

const pickDmTextModel = vi.hoisted(() => vi.fn());

const readDmAiAvailability = vi.hoisted(() => vi.fn());

const checkRateLimit = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({ generateObject, APICallError: { isInstance: () => false }, RetryError: { isInstance: () => false } }));
vi.mock("@/lib/ai/dm-model", () => ({ pickDmTextModel, readDmAiAvailability }));
vi.mock("@/lib/utils/api/rate-limit", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/utils/api/rate-limit")>()), checkRateLimit }));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn(async () => state.actor) }));

import { GET, POST } from "@/app/api/campaigns/[id]/content-import/[kind]/ai-map/route";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { resolveActor } from "@/lib/utils/api/actor";

const actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const ctx = (kind = "units") => ({ params: Promise.resolve({ id: "c1", kind }) });

const post = (body: unknown, kind = "units") => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), ctx(kind)) as Promise<NextResponse>;

const BODY = { headers: ["Ім'я", "HP", "AC"], sample: [{ "Ім'я": "Вовк", HP: "11", AC: "13" }] };

describe("AI-мапінг імпорту", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.actor = actor;
    checkRateLimit.mockResolvedValue({ allowed: true, count: 1, limit: 10, retryAfterSeconds: 0 });
    pickDmTextModel.mockResolvedValue({ id: "model" });
    readDmAiAvailability.mockResolvedValue({ text: true, image: false });
  });

  it("GET: доступність за ключем ДМ; лише ДМ із сесії", async () => {
    const res = (await GET(new Request("http://x"), ctx())) as NextResponse;

    expect(await getResponseJson(res)).toEqual({ available: true });
    expect(resolveActor).toHaveBeenCalledWith(expect.any(Request), "c1", { access: "dm", scope: "content:write", sessionOnly: true });
  });

  it("POST без ключа — 409, модель не кличеться", async () => {
    pickDmTextModel.mockResolvedValue(null);

    const res = await post(BODY);

    expect(res.status).toBe(409);
    expect(await getResponseJson(res)).toMatchObject({ error: API_ERRORS.IMPORT_AI_NO_KEY });
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("POST: лише відомі колонки й поля; решта — null", async () => {
    generateObject.mockResolvedValue({
      object: { mapping: [{ header: "Ім'я", field: "name" }, { header: "HP", field: "hitPoints" }, { header: "Чуже", field: "name" }], notes: ["Перевірте ХП"] },
    });

    const res = await post(BODY);

    expect(await getResponseJson(res)).toEqual({ mapping: { "Ім'я": "name", HP: null, AC: null }, notes: ["Перевірте ХП"] });

    const call = generateObject.mock.calls[0][0] as { model: unknown; prompt: string };

    expect(call.model).toEqual({ id: "model" });
    expect(call.prompt).toMatch(/- maxHp \([^)]*; also known as:/);
    expect(call.prompt).toContain('"Ім\'я"');
  });

  it("помилка провайдера — 502 без тексту помилки (ключ не виходить назовні)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    generateObject.mockRejectedValue(new Error("invalid key sk-secret-123"));

    const res = await post(BODY);

    expect(res.status).toBe(502);
    expect(JSON.stringify(await getResponseJson(res))).not.toContain("sk-secret");
    expect(JSON.stringify(error.mock.calls)).not.toContain("sk-secret");
    error.mockRestore();
  });

  it("ліміт запитів — 429", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, count: 11, limit: 10, retryAfterSeconds: 60 });

    expect((await post(BODY)).status).toBe(429);
    expect(pickDmTextModel).not.toHaveBeenCalled();
  });

  it("невідомий вид — 404; погане тіло — 400", async () => {
    expect((await post(BODY, "tracks")).status).toBe(404);
    expect((await post({ headers: [] })).status).toBe(400);
  });
});
