import { afterEach, describe, expect, it, vi } from "vitest";

import { bodyErrorMessage, campaignGet, campaignRequest, request } from "../client";

describe("campaignRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("без campaignId кидає помилку й не робить запит", async () => {
    const fetch = vi.fn();

    vi.stubGlobal("fetch", fetch);

    await expect(campaignRequest("", "/spells")).rejects.toThrow("Campaign ID is required");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("будує URL кампанії", async () => {
    const fetch = vi.fn(async () => new Response("[]", { status: 200 }));

    vi.stubGlobal("fetch", fetch);

    await campaignGet("c1", "spells");

    expect(fetch).toHaveBeenCalledWith("/api/campaigns/c1/spells", expect.objectContaining({ method: "GET" }));
  });
});

describe("bodyErrorMessage / request errors", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("рядок error показується як є", () => {
    expect(bodyErrorMessage({ error: "Недостатньо прав" }, "x")).toBe("Недостатньо прав");
  });

  it("error + issues — повідомлення з деталями", () => {
    expect(bodyErrorMessage({ error: "Некоректні дані запиту", issues: [{ message: "Required" }, { message: "Too short" }] }, "x")).toBe(
      "Некоректні дані запиту: Required; Too short",
    );
  });

  it("issue з pathLabel — підпис поля перед повідомленням, pathLabel важить більше за path", () => {
    const issues = [
      { path: ["name"], pathLabel: "Назва", message: "Обов'язкове поле" },
      { path: ["attacks", 0, "damageDice"], pathLabel: "Атаки › #1 › Кубики шкоди", message: "Не більше 30 символів" },
      { path: ["customField"], message: "x" },
    ];

    expect(bodyErrorMessage({ error: "Некоректні дані запиту", issues }, "x")).toBe(
      "Некоректні дані запиту: Назва: Обов'язкове поле; Атаки › #1 › Кубики шкоди: Не більше 30 символів; customField: x",
    );
  });

  it("старий формат (error — масив issues) досі читається", () => {
    expect(bodyErrorMessage({ error: [{ message: "Required" }] }, "x")).toBe("Required");
  });

  it("без error — запасний текст", () => {
    expect(bodyErrorMessage(null, "Bad Request")).toBe("Bad Request");
  });

  it("request кидає ApiError з українським повідомленням сервера", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Некоректний JSON у тілі запиту" }), { status: 400 })));

    await expect(request("/api/x")).rejects.toMatchObject({ message: "Некоректний JSON у тілі запиту", status: 400 });
  });
});

describe("request errorKey", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ApiError.errorKey береться з тіла", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Forbidden", errorKey: "errors.forbidden" }), { status: 403 })));

    await expect(request("/api/x")).rejects.toMatchObject({ message: "Forbidden", errorKey: "errors.forbidden" });
  });

  it("тіло без error — HTTP <status>", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 502, statusText: "" })));

    await expect(request("/api/x")).rejects.toMatchObject({ message: "HTTP 502" });
  });
});

describe("request onResponse", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("віддає сиру відповідь до розбору тіла (заголовок Date для годинника)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200, headers: { date: "Mon, 19 Oct 2026 10:00:00 GMT" } })));

    const onResponse = vi.fn();

    await campaignGet("c1", "/x", { onResponse });

    expect(onResponse.mock.calls[0][0].headers.get("date")).toBe("Mon, 19 Oct 2026 10:00:00 GMT");
  });
});
