import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterRow: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { characterLog: { findMany: vi.fn() }, user: { findMany: vi.fn(async () => [{ id: "dm", displayName: "Майстер" }]) } } }));

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, kind: "xp", data: { amount: i }, createdAt: new Date(0), actorUserId: i === 0 ? null : "dm" }));

const get = async (query = "") => {
  const { GET } = await import("../route");

  return GET(new Request(`http://x/log${query}`), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("GET character log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(access.requireCharacterRow).mockResolvedValue({ access: { userId: "owner", isDM: false }, character: { id: "ch", campaignId: "camp" } } as never);
  });

  it("pages of 30 with a cursor", async () => {
    vi.mocked(prisma.characterLog.findMany).mockResolvedValue(rows(31) as never);

    const json = await (await get()).json();

    expect(json.entries).toHaveLength(30);
    expect(json.nextCursor).toBe("l29");
    expect(json.entries[0].actor).toBeNull();
    expect(json.entries[1].actor).toEqual({ id: "dm", displayName: "Майстер" });
    expect(prisma.characterLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { characterId: "ch" }, take: 31 }));
  });

  it("passes the cursor and ends the list", async () => {
    vi.mocked(prisma.characterLog.findMany).mockResolvedValue(rows(2) as never);

    const json = await (await get("?cursor=l29")).json();

    expect(json.nextCursor).toBeNull();
    expect(prisma.characterLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ cursor: { id: "l29" }, skip: 1 }));
  });

  it("another player's 403 passes through", async () => {
    vi.mocked(access.requireCharacterRow).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await get()).status).toBe(403);
  });
});
