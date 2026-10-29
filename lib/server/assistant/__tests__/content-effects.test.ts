import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ removeTrackFile: vi.fn(), trackObjectPath: vi.fn() }));

vi.mock("@/lib/supabase/battle-music-storage", async (original) => ({ ...await original<object>(), ...storage }));

import { createContentActions } from "@/lib/server/assistant/actions/content";
import { CONTENT_EFFECT_HANDLERS } from "@/lib/server/assistant/actions/content-effects";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import type { ActionExecutionContext, DurableEffect } from "@/lib/server/assistant/types";
import { runContentWriteContext } from "@/lib/server/content/write-context";

const actor = { campaignId: "camp", userId: "dm", isDM: true, via: "session", scopes: null } as const;

const url = "https://storage.invalid/battle-music/camp/0123456789abcdef0123456789abcdef.mp3";

const row = { id: "track", campaignId: "camp", kind: "file", url, title: "Бій" };

beforeEach(() => { vi.clearAllMocks(); storage.trackObjectPath.mockReturnValue("camp/0123456789abcdef0123456789abcdef.mp3"); });

describe("content durable effects", () => {
  it("file deletion records cleanup without touching Storage during the domain transaction", async () => {
    let exists = true;

    const db = { campaignTrack: { findFirst: async () => exists ? row : null, deleteMany: async () => { exists = false;

 return { count: 1 }; } } };

    const { createScopedDatabase } = await import("@/lib/server/content/write-context");

    // The actual resource imports the process prisma proxy; its current scope
    // redirects all delegate access to this ORM-only boundary.
    const action = createActionCatalog(createContentActions()).getAction("content.tracks.delete");

    if (action.effect !== "write") throw new Error("write required");

    const effects: DurableEffect[] = [];

    const ctx: ActionExecutionContext = { caller: { actor, channel: "chat", tokenId: null, threadId: null, locale: "uk" as const }, db: createScopedDatabase(db) as never, expected: {}, intentId: "intent", afterCommit: (effect) => effects.push(effect) };

    await runContentWriteContext("camp", db, () => action.execute(ctx, { id: "track" }));
    expect(exists).toBe(false);
    expect(storage.removeTrackFile).not.toHaveBeenCalled();
    expect(effects).toEqual([expect.objectContaining({ kind: "media-cleanup", payload: { campaignId: "camp", url } })]);
    await CONTENT_EFFECT_HANDLERS["media-cleanup"]!(effects[0].payload, effects[0].key);
    expect(storage.removeTrackFile).toHaveBeenCalledWith(url, { strict: true });
  });

  it("cleanup refuses a file belonging to another campaign", async () => {
    storage.trackObjectPath.mockReturnValue("other/0123456789abcdef0123456789abcdef.mp3");
    await expect(CONTENT_EFFECT_HANDLERS["media-cleanup"]!({ campaignId: "camp", url }, "cleanup")).rejects.toThrow();
    expect(storage.removeTrackFile).not.toHaveBeenCalled();
  });
});
