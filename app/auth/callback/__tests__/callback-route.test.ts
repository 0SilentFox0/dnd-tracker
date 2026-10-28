import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn(), getUser: vi.fn() }));

const ensureDbUser = vi.hoisted(() => vi.fn());

const syncUserLocale = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("@/lib/server/users/db-user", () => ({ ensureDbUser }));
vi.mock("@/lib/server/users/locale", () => ({ syncUserLocale }));

import { GET } from "../route";

const call = async (query: string) => {
  const res = await GET(new Request(`http://app.test/auth/callback${query}`));

  const location = new URL(res.headers.get("location") ?? "");

  return location.pathname + location.search;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  syncUserLocale.mockResolvedValue(null);
  auth.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.test" } }, error: null });
});

describe("GET /auth/callback", () => {
  it("passes the pre-login cookie locale to syncUserLocale and sets the cookie for a profile locale", async () => {
    syncUserLocale.mockResolvedValue("uk");

    const res = await GET(new Request("http://app.test/auth/callback?code=c1", { headers: { cookie: "NEXT_LOCALE=en" } }));

    expect(syncUserLocale).toHaveBeenCalledWith("u1", "en");
    expect(res.headers.get("set-cookie")).toContain("NEXT_LOCALE=uk");
  });

  it("exchanges the code, syncs the user and goes to the campaigns", async () => {
    expect(await call("?code=c1")).toBe("/campaigns");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("c1");
    expect(ensureDbUser).toHaveBeenCalledWith({ id: "u1", email: "a@b.test" }, { refresh: true });
  });

  it("follows a same-origin next and ignores an external one", async () => {
    expect(await call("?code=c1&next=%2Fcampaigns%2Fx")).toBe("/campaigns/x");
    expect(await call("?code=c1&next=%2F%2Fevil.test")).toBe("/campaigns");
  });

  it("verifies a token_hash link and sends recovery to the new password page", async () => {
    expect(await call("?token_hash=h1&type=recovery")).toBe("/reset-password");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "h1" });
  });

  it("sends a broken recovery link back to the forgot-password page", async () => {
    expect(await call("?error=access_denied&error_code=otp_expired&next=%2Freset-password")).toBe("/forgot-password?error=otp_expired");
  });

  it("reports the Supabase error code of a failed exchange", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { code: "flow_state_not_found", message: "x" } });

    expect(await call("?code=c1")).toBe("/sign-in?error=flow_state_not_found");
  });

  it("rejects a link without a code", async () => {
    expect(await call("")).toBe("/sign-in?error=no_code");
  });

  it("still signs in when the DB sync fails", async () => {
    ensureDbUser.mockRejectedValue(new Error("db down"));

    expect(await call("?code=c1")).toBe("/campaigns");
  });
});
