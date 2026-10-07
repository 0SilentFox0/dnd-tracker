import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";

const signOut = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut } }) }));

const post = (origin?: string) =>
  new NextRequest("http://app.test/auth/signout", { method: "POST", headers: origin ? { origin, host: "app.test" } : { host: "app.test" } });

describe("POST /auth/signout", () => {
  beforeEach(() => {
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
  });

  it("виходить і відповідає 303 на /sign-in", async () => {
    const res = await POST(post("http://app.test"));

    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/sign-in");
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("помилка глобального виходу — локальний вихід чистить cookies", async () => {
    signOut.mockResolvedValueOnce({ error: new Error("network") });

    const res = await POST(post());

    expect(signOut).toHaveBeenLastCalledWith({ scope: "local" });
    expect(res.status).toBe(303);
  });

  it("чужий Origin — 403 без виходу", async () => {
    const res = await POST(post("http://evil.test"));

    expect(res.status).toBe(403);
    expect(signOut).not.toHaveBeenCalled();
  });
});
