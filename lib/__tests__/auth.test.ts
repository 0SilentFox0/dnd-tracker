import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthUser, getAuthUserOptional, getSessionUserId } from "@/lib/auth";

const getClaims = vi.hoisted(() => vi.fn());

const getUser = vi.hoisted(() => vi.fn());

const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
);

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims, getUser } }) }));
vi.mock("next/navigation", () => ({ redirect }));

describe("lib/auth (claims)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1", email: "a@b.c" } } });
  });

  it("getAuthUser — id і email з claims без запиту до Supabase Auth", async () => {
    expect(await getAuthUser()).toEqual({ id: "u1", email: "a@b.c" });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("getAuthUser без сесії — redirect на /sign-in", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    await expect(getAuthUser()).rejects.toThrow("redirect:/sign-in");
  });

  it("getAuthUserOptional без сесії — null", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("expired") });

    expect(await getAuthUserOptional()).toBeNull();
  });

  it("getSessionUserId — sub або null", async () => {
    expect(await getSessionUserId()).toBe("u1");

    getClaims.mockResolvedValue({ data: null, error: null });

    expect(await getSessionUserId()).toBeNull();
  });
});
