import { isValidElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { battleQueryKey } from "@/lib/hooks/battles/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";

const readBattleScene = vi.hoisted(() => vi.fn());

const getSessionUserId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils/battle/pipeline/read-battle", () => ({ readBattleScene }));
vi.mock("@/lib/auth", () => ({ getSessionUserId }));
vi.mock("../BattlePageClient", () => ({ BattlePageClient: () => null }));

import BattlePage from "../page";

const params = Promise.resolve({ id: "c1", battleId: "b1" });

describe("BattlePage (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserId.mockResolvedValue("u1");
  });

  it("кладе в кеш ту саму сцену, що віддає GET, під ключем useBattle", async () => {
    const scene = { id: "b1", version: 4, name: "Засідка" };

    readBattleScene.mockResolvedValue(NextResponse.json(scene));

    const el = (await BattlePage({ params })) as ReactElement<{ queryKey: unknown; data: unknown; children: ReactElement<{ userId: string | null }> }>;

    expect(readBattleScene).toHaveBeenCalledWith({ id: "c1", battleId: "b1" });
    expect(el.type).toBe(PrefetchedQuery);
    expect(el.props.queryKey).toEqual(battleQueryKey("c1", "b1"));
    expect(el.props.data).toEqual(scene);
    expect(isValidElement(el.props.children) && el.props.children.props.userId).toBe("u1");
  });

  it("помилка доступу — без даних, клієнт покаже свій стан як раніше", async () => {
    readBattleScene.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const el = (await BattlePage({ params })) as ReactElement<{ data: unknown }>;

    expect(el.props.data).toBeNull();
  });
});
