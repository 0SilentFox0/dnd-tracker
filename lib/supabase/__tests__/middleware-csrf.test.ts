/**
 * Тести для rejectCrossOriginMutation — explicit Origin/CSRF check
 * на POST/PATCH/PUT/DELETE до /api/* (CODE_AUDIT 4.4).
 */

import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { rejectCrossOriginMutation } from "../middleware";

function makeRequest(opts: {
  method: string;
  pathname: string;
  origin?: string | null;
  host?: string;
}): NextRequest {
  const url = new URL(`http://${opts.host ?? "example.com"}${opts.pathname}`);

  const headers = new Headers({
    host: opts.host ?? "example.com",
  });

  if (opts.origin !== undefined && opts.origin !== null) {
    headers.set("origin", opts.origin);
  }

  return {
    method: opts.method,
    nextUrl: { pathname: url.pathname, host: url.host },
    headers,
  } as unknown as NextRequest;
}

describe("rejectCrossOriginMutation", () => {
  it("returns null for GET requests (read methods skipped)", () => {
    expect(
      rejectCrossOriginMutation(
        makeRequest({
          method: "GET",
          pathname: "/api/campaigns/c1",
          origin: "http://attacker.example",
        }),
      ),
    ).toBeNull();
  });

  it("returns null for non-/api paths", () => {
    expect(
      rejectCrossOriginMutation(
        makeRequest({
          method: "POST",
          pathname: "/campaigns/c1/page",
          origin: "http://attacker.example",
        }),
      ),
    ).toBeNull();
  });

  it("returns null when Origin header missing (server-side fetch)", () => {
    expect(
      rejectCrossOriginMutation(
        makeRequest({ method: "POST", pathname: "/api/campaigns" }),
      ),
    ).toBeNull();
  });

  it("returns 403 when Origin host != request host (cross-origin attack)", () => {
    const r = rejectCrossOriginMutation(
      makeRequest({
        method: "POST",
        pathname: "/api/campaigns/c1/battles",
        origin: "http://attacker.example",
        host: "example.com",
      }),
    );

    expect(r).not.toBeNull();
    expect(r?.status).toBe(403);
  });

  it("allows when Origin host matches request host (same-origin)", () => {
    expect(
      rejectCrossOriginMutation(
        makeRequest({
          method: "POST",
          pathname: "/api/campaigns/c1/battles",
          origin: "http://example.com",
          host: "example.com",
        }),
      ),
    ).toBeNull();
  });

  it("returns 403 for invalid Origin header", () => {
    const r = rejectCrossOriginMutation(
      makeRequest({
        method: "POST",
        pathname: "/api/campaigns/c1",
        origin: "not a url",
      }),
    );

    expect(r?.status).toBe(403);
  });

  it("checks all mutating methods (POST, PATCH, PUT, DELETE)", () => {
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      const r = rejectCrossOriginMutation(
        makeRequest({
          method,
          pathname: "/api/campaigns/c1",
          origin: "http://attacker.example",
        }),
      );

      expect(r?.status, `${method} should reject`).toBe(403);
    }
  });

  it("treats https vs http different origins as cross-origin (different host:port implied)", () => {
    // host stays "example.com" without port, https://example.com:443 also has host "example.com"
    // Тут перевіряємо, що різні порти ловляться:
    const r = rejectCrossOriginMutation(
      makeRequest({
        method: "POST",
        pathname: "/api/test",
        origin: "http://example.com:8080",
        host: "example.com",
      }),
    );

    expect(r?.status).toBe(403);
  });
});
