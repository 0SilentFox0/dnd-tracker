import { afterEach, describe, expect, it, vi } from "vitest";

import { campaignGet, campaignRequest, errorMessage, request } from "../client";

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

describe("errorMessage / request errors", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("рядок error показується як є", () => {
    expect(errorMessage({ error: "Недостатньо прав" }, "x")).toBe("Недостатньо прав");
  });

  it("error + issues — повідомлення з деталями", () => {
    expect(errorMessage({ error: "Некоректні дані запиту", issues: [{ message: "Required" }, { message: "Too short" }] }, "x")).toBe(
      "Некоректні дані запиту: Required; Too short",
    );
  });

  it("старий формат (error — масив issues) досі читається", () => {
    expect(errorMessage({ error: [{ message: "Required" }] }, "x")).toBe("Required");
  });

  it("без error — запасний текст", () => {
    expect(errorMessage(null, "Bad Request")).toBe("Bad Request");
  });

  it("request кидає ApiError з українським повідомленням сервера", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Некоректний JSON у тілі запиту" }), { status: 400 })));

    await expect(request("/api/x")).rejects.toMatchObject({ message: "Некоректний JSON у тілі запиту", status: 400 });
  });
});
