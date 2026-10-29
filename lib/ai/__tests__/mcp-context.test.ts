import { describe, expect, it, vi } from "vitest";

import { buildToolContext } from "../mcp-context";

vi.mock("server-only", () => ({}));

const auth = { tokenId: "t", campaignId: "c", userId: "u", scopes: [], locale: "en" } as Parameters<typeof buildToolContext>[0];

const reqWith = (headers: Record<string, string>) => new Request("http://x/api/mcp", { headers });

describe("buildToolContext locale", () => {
  it("prefers the locale cookie over Accept-Language and the token owner", () => {
    const ctx = buildToolContext({ ...auth, locale: "en" }, reqWith({ cookie: "a=1; NEXT_LOCALE=uk", "accept-language": "en-US" }));

    expect(ctx.locale).toBe("uk");
    expect(ctx.caller?.locale).toBe("uk");
  });

  it("falls back to Accept-Language", () => {
    expect(buildToolContext({ ...auth, locale: "uk" }, reqWith({ "accept-language": "fr;q=0.9, en;q=0.8" })).locale).toBe("en");
  });

  it("falls back to the token owner locale when nothing is negotiable", () => {
    expect(buildToolContext({ ...auth, locale: "uk" }, reqWith({ cookie: "NEXT_LOCALE=fr", "accept-language": "fr" })).locale).toBe("uk");
    expect(buildToolContext({ ...auth, locale: "en" }, reqWith({})).locale).toBe("en");
  });

  it("builds an MCP DM caller with the token scopes", () => {
    const ctx = buildToolContext(auth, reqWith({}));

    expect(ctx.caller).toMatchObject({ channel: "mcp", tokenId: "t", actor: { isDM: true, via: "token", campaignId: "c", userId: "u" } });
  });
});
