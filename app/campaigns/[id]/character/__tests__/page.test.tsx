import type { ReactElement } from "react";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { characterSheetKey } from "@/lib/hooks/characters/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";

const readCharacterSheet = vi.hoisted(() => vi.fn());

const requireCampaignMember = vi.hoisted(() => vi.fn());

const findFirst = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/campaigns/[id]/characters/[characterId]/sheet/read-sheet", () => ({ readCharacterSheet }));
vi.mock("@/lib/campaigns/access", () => ({ requireCampaignMember }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findFirst } } }));
vi.mock("@/components/character-profile", () => ({ CharacterProfile: () => null }));

import CharacterPage from "../page";

const render = () =>
  CharacterPage({ params: Promise.resolve({ id: "c1" }), searchParams: Promise.resolve({ tab: "magic" }) }) as Promise<
    ReactElement<{ queryKey: unknown; data: unknown; children: ReactElement<{ characterId: string; initialTab?: string }> }>
  >;

describe("CharacterPage (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCampaignMember.mockResolvedValue({ userId: "u1", isDM: false, campaign: { maxLevel: 20 } });
    findFirst.mockResolvedValue({ id: "ch1" });
  });

  it("кладе в кеш лист із GET-обробника під ключем useCharacterSheet", async () => {
    const sheet = { identity: { name: "Ліра" } };

    readCharacterSheet.mockResolvedValue(NextResponse.json(sheet));

    const el = await render();

    expect(readCharacterSheet).toHaveBeenCalledWith({ id: "c1", characterId: "ch1", known: { userId: "u1", isDM: false, maxLevel: 20 } });
    expect(el.type).toBe(PrefetchedQuery);
    expect(el.props.queryKey).toEqual(characterSheetKey("c1", "ch1"));
    expect(el.props.data).toEqual(sheet);
    expect(el.props.children.props).toMatchObject({ characterId: "ch1", initialTab: "magic" });
  });

  it("помилка обробника — без даних", async () => {
    readCharacterSheet.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    expect((await render()).props.data).toBeNull();
  });

  it("немає персонажа — лист не читається", async () => {
    findFirst.mockResolvedValue(null);

    await render();

    expect(readCharacterSheet).not.toHaveBeenCalled();
  });
});
