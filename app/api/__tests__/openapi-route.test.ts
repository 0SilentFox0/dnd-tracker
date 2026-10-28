import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "@/app/api/openapi.json/route";

describe("GET /api/openapi.json", () => {
  it("публічний, кешований, однаковий з токеном і без", async () => {
    const anon = await GET(new Request("http://x/api/openapi.json"));

    const withToken = await GET(new Request("http://x/api/openapi.json", { headers: { Authorization: "Bearer dt_whatever" } }));

    expect(anon.status).toBe(200);
    expect(anon.headers.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
    expect(anon.headers.get("Set-Cookie")).toBeNull();
    expect(await anon.text()).toBe(await withToken.text());
  });

  it("документ без даних кампанії (лише шаблон {id})", async () => {
    const body = await (await GET(new Request("http://x/api/openapi.json"))).json();

    expect(body.openapi).toBe("3.1.0");
    expect(Object.keys(body.paths).every((p: string) => p.startsWith("/api/campaigns/{id}"))).toBe(true);
  });
});
