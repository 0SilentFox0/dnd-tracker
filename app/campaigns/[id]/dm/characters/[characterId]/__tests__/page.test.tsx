import type { ReactElement } from "react";
import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { campaignKeys } from "@/lib/hooks/campaigns/keys";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";

const readCharacterSheet = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/characters/core/read-sheet", () => ({ readCharacterSheet }));
vi.mock("@/lib/server/campaigns/rules", () => ({ loadRules: vi.fn(async () => ({ morale: { enabled: false } })) }));
vi.mock("@/components/character-profile", () => ({ CharacterProfile: () => null }));

import DmCharacterPage from "../page";

describe("DmCharacterPage (server)", () => {
  it("кладе в кеш лист із GET-обробника", async () => {
    const sheet = { identity: { name: "Ґоблін" } };

    readCharacterSheet.mockResolvedValue(NextResponse.json(sheet));

    const el = (await DmCharacterPage({
      params: Promise.resolve({ id: "c1", characterId: "ch9" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement<{ queryKey: unknown; data: unknown; children: ReactElement<{ queryKey: unknown; data: unknown; children: ReactElement<{ canEdit: boolean }> }> }>;

    expect(readCharacterSheet).toHaveBeenCalledWith({ id: "c1", characterId: "ch9" });
    expect(el.type).toBe(PrefetchedQuery);
    expect(el.props.queryKey).toEqual(characterKeys.sheet("c1", "ch9"));
    expect(el.props.data).toEqual(sheet);
    expect(el.props.children.props.queryKey).toEqual(campaignKeys.rules("c1"));
    expect(el.props.children.props.data).toEqual({ morale: { enabled: false } });
    expect(el.props.children.props.children.props.canEdit).toBe(true);
  });
});
