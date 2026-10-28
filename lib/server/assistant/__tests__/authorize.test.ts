import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { authorizeAssistant } from "@/lib/server/assistant/authorize";
import type { AssistantCaller } from "@/lib/server/assistant/types";

vi.mock("@/lib/db", () => ({ prisma: { campaignMember: { findMany: vi.fn() }, apiToken: { findUnique: vi.fn() } } }));

const caller: AssistantCaller = { actor: { campaignId: "campaign", userId: "dm", isDM: true, via: "token", scopes: ["characters:write"] }, channel: "mcp", tokenId: "token", threadId: null };

const need = { access: "dm", scope: "characters:write" } as const;

const active = { id: "token", campaignId: "campaign", userId: "dm", scopes: ["characters:write"], revokedAt: null };

describe("assistant authorization uses current membership and token grants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ role: "dm" }] as never);
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue(active as never);
  });

  it("accepts an active DM token and a real DM session", async () => {
    await expect(authorizeAssistant(caller, need)).resolves.toBeUndefined();
    await expect(authorizeAssistant({ ...caller, actor: { ...caller.actor, via: "session", scopes: null }, channel: "chat", tokenId: null }, need)).resolves.toBeUndefined();
  });

  it("rejects lost DM membership despite a stale isDM assertion", async () => {
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ role: "player" }] as never);
    await expect(authorizeAssistant(caller, need)).rejects.toMatchObject({ status: 403 });
  });

  it.each([
    { ...active, revokedAt: new Date() }, { ...active, campaignId: "other-campaign" },
    { ...active, userId: "another-dm" }, { ...active, scopes: ["ai"] }, null,
  ])("rejects revoked, foreign or insufficient persisted token grants", async (row) => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue(row as never);
    await expect(authorizeAssistant(caller, need)).rejects.toMatchObject({ status: 403 });
  });

  it("new persisted grants never elevate a stale caller's original grants", async () => {
    await expect(authorizeAssistant({ ...caller, actor: { ...caller.actor, scopes: ["ai"] } }, need)).rejects.toMatchObject({ status: 403 });
  });

  it("prepares session-only changes but never executes them as a token", async () => {
    const sessionNeed = { ...need, sessionOnly: true } as const;

    await expect(authorizeAssistant(caller, sessionNeed, "prepare")).resolves.toBeUndefined();
    await expect(authorizeAssistant(caller, sessionNeed)).rejects.toMatchObject({ status: 403 });
  });

  it("fails closed for token without identity/scopes and inconsistent channels", async () => {
    for (const bad of [
      { ...caller, tokenId: null }, { ...caller, actor: { ...caller.actor, scopes: null } },
      { ...caller, actor: { ...caller.actor, isDM: false } }, { ...caller, channel: "chat" as const },
      { ...caller, actor: { ...caller.actor, via: "invalid" } } as never,
    ]) await expect(authorizeAssistant(bad, need)).rejects.toMatchObject({ status: 403 });
  });
});
