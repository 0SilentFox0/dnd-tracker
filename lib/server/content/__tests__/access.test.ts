import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { NEED } from "@/lib/utils/api/need";

const base = { campaignId: "c1", userId: "u1", isDM: true, via: "token" as const };

const status = (fn: () => void) => {
  try {
    fn();

    return 0;
  } catch (e) {
    return e instanceof ContentError ? e.status : -1;
  }
};

describe("assertCan", () => {
  it("токен content:read не пише", () => expect(status(() => assertCan({ ...base, scopes: ["content:read"] }, NEED.write))).toBe(403));
  it("content:write читає і пише", () => {
    expect(status(() => assertCan({ ...base, scopes: ["content:write"] }, NEED.read("member")))).toBe(0);
    expect(status(() => assertCan({ ...base, scopes: ["content:write"] }, NEED.write))).toBe(0);
  });
  it("токен ai без контенту — 403", () => expect(status(() => assertCan({ ...base, scopes: ["ai"] }, NEED.read("member")))).toBe(403));
  it("sessionOnly через токен — 403", () => expect(status(() => assertCan({ ...base, scopes: ["content:write"] }, NEED.writeAll))).toBe(403));
  it("сесія гравця: читання member — так, dm — ні", () => {
    const player = { ...base, via: "session" as const, isDM: false, scopes: null };

    expect(status(() => assertCan(player, NEED.read("member")))).toBe(0);
    expect(status(() => assertCan(player, NEED.read("dm")))).toBe(403);
    expect(status(() => assertCan(player, NEED.write))).toBe(403);
  });
});
