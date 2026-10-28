import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { isChannelAllowedForUser } from "../channel-access";

describe("isChannelAllowedForUser notify channel", () => {
  it("allows the user's own notify channel", async () => {
    expect(await isChannelAllowedForUser("private-notify-u1", "u1")).toBe(true);
  });

  it("rejects another user's notify channel", async () => {
    expect(await isChannelAllowedForUser("private-notify-u1", "u2")).toBe(false);
  });

  it("rejects an empty notify id", async () => {
    expect(await isChannelAllowedForUser("private-notify-", "u1")).toBe(false);
  });
});
