import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateSession } from "../middleware";

const getClaims = vi.hoisted(() => vi.fn());

const getUser = vi.hoisted(() => vi.fn());

const createServerClient = vi.hoisted(() => vi.fn(() => ({ auth: { getClaims, getUser } })));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

const request = (pathname: string, init?: { method?: string; origin?: string }) =>
  new NextRequest(`http://app.test${pathname}`, {
    method: init?.method ?? "GET",
    headers: init?.origin ? { origin: init.origin, host: "app.test" } : { host: "app.test" },
  });

const signedIn = () => getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });

const signedOut = () => getClaims.mockResolvedValue({ data: null, error: null });

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("/api — без Supabase Auth: маршрути самі перевіряють сесію і віддають 401", async () => {
    signedOut();

    const res = await updateSession(request("/api/campaigns"));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("/api — CSRF-перевірка лишається", async () => {
    const res = await updateSession(request("/api/campaigns", { method: "POST", origin: "http://evil.test" }));

    expect(res.status).toBe(403);
  });

  it("сторінка без сесії — redirect на /sign-in", async () => {
    signedOut();

    const res = await updateSession(request("/campaigns/c1"));

    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/sign-in");
  });

  it("сторінка із сесією — пропускає, перевіряючи JWT через getClaims, а не getUser", async () => {
    signedIn();

    const res = await updateSession(request("/campaigns/c1"));

    expect(res.headers.get("location")).toBeNull();
    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("/sign-in із сесією — redirect на /campaigns", async () => {
    signedIn();

    const res = await updateSession(request("/sign-in"));

    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/campaigns");
  });

  it("публічні сторінки без сесії — пропускає", async () => {
    signedOut();

    for (const path of ["/sign-in", "/sign-up", "/auth/callback"]) {
      expect((await updateSession(request(path))).headers.get("location")).toBeNull();
    }
  });
});
