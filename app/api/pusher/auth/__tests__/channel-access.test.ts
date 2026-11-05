import { describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { battleScene: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));

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

describe("isChannelAllowedForUser battle channels", () => {
  const found = (members: unknown[]) => findUnique.mockResolvedValueOnce({ campaign: { members } });

  it("dm-канал: ДМ так, гравець ні, неіснуючий бій ні", async () => {
    found([{ userId: "u1" }]);

    expect(await isChannelAllowedForUser("private-battle-dm-b1", "u1")).toBe(true);
    expect(findUnique.mock.calls.at(-1)?.[0]).toMatchObject({ where: { id: "b1" }, select: { campaign: { select: { members: { where: { userId: "u1", role: "dm" } } } } } });

    found([]);

    expect(await isChannelAllowedForUser("private-battle-dm-b1", "u2")).toBe(false);

    findUnique.mockResolvedValueOnce(null);

    expect(await isChannelAllowedForUser("private-battle-dm-nope", "u1")).toBe(false);
    expect(await isChannelAllowedForUser("private-battle-dm-", "u1")).toBe(false);
  });

  it("звичайний канал бою — будь-який учасник; dm- не трактується як battleId", async () => {
    found([{ userId: "u2" }]);

    expect(await isChannelAllowedForUser("private-battle-b1", "u2")).toBe(true);
    expect(findUnique.mock.calls.at(-1)?.[0]).toMatchObject({ where: { id: "b1" } });
  });
});
