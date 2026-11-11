import type { ReactElement } from "react";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { campaignKeys } from "@/lib/hooks/campaigns/keys";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const readCharacterSheet = vi.hoisted(() => vi.fn());

const requireCampaignMember = vi.hoisted(() => vi.fn());

const findFirst = vi.hoisted(() => vi.fn());

const wfrp = vi.hoisted(() => ({ is: false }));

vi.mock("@/lib/server/characters/core/read-sheet", () => ({ readCharacterSheet }));
vi.mock("@/lib/server/campaigns/access", () => ({ requireCampaignMember }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findFirst } } }));
vi.mock("@/lib/server/campaigns/system-key", () => ({ systemKeyOfCampaign: () => Promise.resolve(wfrp.is ? "wfrp" : "homm") }));
vi.mock("@/lib/i18n/extend-locale-scope", () => ({ ExtendLocaleScope: ({ children, namespaces }: { children: React.ReactNode; namespaces: string[] }) => <div data-scope={namespaces.join(",")}>{children}</div> }));
vi.mock("@/components/character-profile", () => ({ CharacterProfile: () => null }));

import CharacterPage from "../page";

const render = () =>
  CharacterPage({ params: Promise.resolve({ id: "c1" }), searchParams: Promise.resolve({ tab: "magic" }) }) as Promise<
    ReactElement<{ queryKey: unknown; data: unknown; children: ReactElement<{ queryKey: unknown; data: unknown; children: ReactElement<{ characterId: string; initialTab?: string }> }> }>
  >;

describe("CharacterPage (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCampaignMember.mockResolvedValue({ userId: "u1", isDM: false, campaign: { maxLevel: 20 } });
    findFirst.mockResolvedValue({ id: "ch1" });
    wfrp.is = false;
  });

  it("кладе в кеш лист із GET-обробника під ключем useCharacterSheet", async () => {
    const sheet = { identity: { name: "Ліра" } };

    readCharacterSheet.mockResolvedValue(NextResponse.json(sheet));

    const el = await render();

    expect(readCharacterSheet).toHaveBeenCalledWith({ id: "c1", characterId: "ch1", known: { userId: "u1", isDM: false, maxLevel: 20, rules: DEFAULT_RULES } });
    expect(el.type).toBe(PrefetchedQuery);
    expect(el.props.queryKey).toEqual(characterKeys.sheet("c1", "ch1"));
    expect(el.props.data).toEqual(sheet);
    expect(el.props.children.props.queryKey).toEqual(campaignKeys.rules("c1"));
    expect(el.props.children.props.data).toEqual(DEFAULT_RULES);
    expect(el.props.children.props.children.props).toMatchObject({ characterId: "ch1", initialTab: "magic" });
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

  it("wfrp: профіль у scope wfrpDowntime+wfrpCorruption, homm: без нього", async () => {
    readCharacterSheet.mockResolvedValue(NextResponse.json({}));
    wfrp.is = true;

    const scoped = (await render()) as unknown as ReactElement<{ namespaces: string[]; children: ReactElement }>;

    expect(scoped.props.namespaces).toEqual(["wfrpDowntime", "wfrpCorruption"]);
    expect(scoped.props.children.type).toBe(PrefetchedQuery);

    wfrp.is = false;
    readCharacterSheet.mockResolvedValue(NextResponse.json({}));

    expect(((await render()) as ReactElement).type).toBe(PrefetchedQuery);
  });
});
