// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as battlesApi from "@/lib/api/battles";
import * as decksApi from "@/lib/api/decks";
import { battleKeys } from "@/lib/hooks/battles";
import { useScenarioPlay } from "@/lib/hooks/scenario";
import type { ScenarioContent, ScenarioRow } from "@/types/scenario";
import type { ShowState } from "@/types/show";

const send = vi.fn(async () => true);

let show: ShowState | null = null;

vi.mock("@/lib/api/battles", () => ({ getBattleBriefs: vi.fn(async () => []), startBattle: vi.fn(async () => ({})) }));
vi.mock("@/lib/api/decks", () => ({ getDeck: vi.fn(async () => ({ id: "d1", slides: [{ id: "sl1", imageUrl: "https://x/a.webp" }] })) }));
vi.mock("@/lib/hooks/common", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/hooks/common")>()), useNotify: () => vi.fn() }));
vi.mock("@/lib/hooks/show", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/hooks/show")>()),
  usePusherShowSync: () => undefined,
  useShowState: () => ({ show }),
  useShowControl: () => ({ send, pending: false }),
}));

const p = { type: "doc" as const, content: [] };

const slideRow: ScenarioRow = { id: "r1", story: p, notes: p, slide: { deckId: "d1", slideId: "sl1" } };

const battleRow: ScenarioRow = { id: "r2", story: p, notes: p, battleId: "b1" };

const content: ScenarioContent = { legend: [], sections: [{ id: "s1", title: "S", played: false, rows: [slideRow, battleRow] }] };

const brief = (status: string) => ({ id: "b1", name: "Засідка", status });

function setup(status = "prepared") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  client.setQueryData(battleKeys.briefs("c"), [brief(status)]);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return { client, ...renderHook(() => useScenarioPlay("c", content), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  show = null;
});

describe("useScenarioPlay", () => {
  it("showSlide шле open для готового рядка", async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.lookup.decks.get("d1")).toBeTruthy());
    act(() => result.current.showSlide(slideRow));

    expect(send).toHaveBeenCalledWith({ action: "open", deckId: "d1", slideId: "sl1" });
  });

  it("showSlide пропускає вже активний слайд", async () => {
    show = { deckId: "d1", deckTitle: "Д", slide: { id: "sl1", imageUrl: "https://x/a.webp" }, nextImageUrl: null, audio: null, seq: 1 };

    const { result } = setup();

    await waitFor(() => expect(result.current.lookup.decks.get("d1")).toBeTruthy());
    act(() => result.current.showSlide(slideRow));

    expect(send).not.toHaveBeenCalled();
  });

  it("runBattle на prepared: спершу start, потім виклик у показі", async () => {
    const { result } = setup("prepared");

    await act(async () => result.current.runBattle(battleRow));

    await waitFor(() => expect(send).toHaveBeenCalledWith({ action: "battle", battleId: "b1" }));
    expect(battlesApi.startBattle).toHaveBeenCalledWith("c", "b1", {});
    expect(vi.mocked(battlesApi.startBattle).mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0]);
  });

  it("runBattle на active: лише виклик, без start", async () => {
    const { result } = setup("active");

    await act(async () => result.current.runBattle(battleRow));

    await waitFor(() => expect(send).toHaveBeenCalledWith({ action: "battle", battleId: "b1" }));
    expect(battlesApi.startBattle).not.toHaveBeenCalled();
  });

  it("кеш уже active, хоча рядок бачив prepared: start не повторюється", async () => {
    const { result, client } = setup("prepared");

    client.setQueryData(battleKeys.briefs("c"), [brief("active")]);
    await act(async () => result.current.runBattle(battleRow));

    expect(battlesApi.startBattle).not.toHaveBeenCalled();
  });

  it("enabled=false: ні списку боїв, ні наборів не вантажимо", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    renderHook(() => useScenarioPlay("c", content, false), { wrapper });
    await Promise.resolve();

    expect(battlesApi.getBattleBriefs).not.toHaveBeenCalled();
    expect(decksApi.getDeck).not.toHaveBeenCalled();
  });

  it("без прив'язок до боїв список боїв не вантажиться", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    renderHook(() => useScenarioPlay("c", { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [slideRow] }] }), { wrapper });
    await waitFor(() => expect(decksApi.getDeck).toHaveBeenCalled());

    expect(battlesApi.getBattleBriefs).not.toHaveBeenCalled();
  });
});
