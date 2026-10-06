import type { ReactElement } from "react";
import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { characterSheetKey } from "@/lib/hooks/characters/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";

const readCharacterSheet = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/campaigns/[id]/characters/[characterId]/sheet/read-sheet", () => ({ readCharacterSheet }));
vi.mock("@/components/character-profile", () => ({ CharacterProfile: () => null }));

import DmCharacterPage from "../page";

describe("DmCharacterPage (server)", () => {
  it("кладе в кеш лист із GET-обробника", async () => {
    const sheet = { identity: { name: "Ґоблін" } };

    readCharacterSheet.mockResolvedValue(NextResponse.json(sheet));

    const el = (await DmCharacterPage({
      params: Promise.resolve({ id: "c1", characterId: "ch9" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement<{ queryKey: unknown; data: unknown; children: ReactElement<{ canEdit: boolean }> }>;

    expect(readCharacterSheet).toHaveBeenCalledWith({ id: "c1", characterId: "ch9" });
    expect(el.type).toBe(PrefetchedQuery);
    expect(el.props.queryKey).toEqual(characterSheetKey("c1", "ch9"));
    expect(el.props.data).toEqual(sheet);
    expect(el.props.children.props.canEdit).toBe(true);
  });
});
