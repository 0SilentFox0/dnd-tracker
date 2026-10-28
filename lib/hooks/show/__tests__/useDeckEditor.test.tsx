// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { showKeys } from "../keys";
import { useDeckEditor } from "../useDeckEditor";

import { ApiError } from "@/lib/api/client";
import { getDeck, saveDeck } from "@/lib/api/decks";
import { ConfirmContext } from "@/lib/hooks/common";
import type { SlideDeck } from "@/types/show";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/decks", () => ({ saveDeck: vi.fn(), getDeck: vi.fn(), getDecks: vi.fn(), createDeck: vi.fn(), deleteDeck: vi.fn(), uploadSlideImage: vi.fn() }));

const slide = (n: number) => ({ id: `slide-000${n}`, imageUrl: `https://x/${n}.webp` });

const deck = (updatedAt: string, slides = [slide(1)]): SlideDeck => ({ id: "d1", title: "Таверна", scenarioPageId: null, slides, updatedAt });

const T1 = "2026-01-01T00:00:00.000Z";

const T2 = "2026-01-02T00:00:00.000Z";

const T3 = "2026-01-03T00:00:00.000Z";

const conflict = () => new ApiError("Набір змінено", 409, "/decks/d1");

function setup(initial = deck(T1), answer = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const notify = vi.fn(async () => answer);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ConfirmContext.Provider value={notify}>{children}</ConfirmContext.Provider>
    </QueryClientProvider>
  );

  return { client, notify, ...renderHook(() => useDeckEditor("c1", initial), { wrapper }) };
}

afterEach(() => vi.clearAllMocks());

describe("useDeckEditor", () => {
  it("зберігає з expectedUpdatedAt, а наступне збереження бере новий updatedAt", async () => {
    vi.mocked(saveDeck).mockResolvedValueOnce(deck(T2, [slide(1)])).mockResolvedValueOnce(deck(T3, [slide(1)]));

    const { result } = setup();

    act(() => result.current.dispatch({ type: "rename", title: "Нова" }));

    let ok = false;

    await act(async () => void (ok = await result.current.save()));
    expect(ok).toBe(true);
    expect(vi.mocked(saveDeck).mock.calls[0][2]).toMatchObject({ expectedUpdatedAt: T1 });

    act(() => result.current.dispatch({ type: "rename", title: "Ще" }));
    await act(async () => void (await result.current.save()));
    expect(vi.mocked(saveDeck).mock.calls[1][2]).toMatchObject({ expectedUpdatedAt: T2 });
  });

  it("помилка збереження — false", async () => {
    vi.mocked(saveDeck).mockRejectedValueOnce(new Error("Набір змінено"));

    const { result } = setup();

    act(() => result.current.dispatch({ type: "rename", title: "Нова" }));

    let ok = true;

    await act(async () => void (ok = await result.current.save()));
    expect(ok).toBe(false);
    expect(result.current.dirty).toBe(true);
  });

  it("новіший набір із сервера чистить чернетку, але не затирає незбережені правки", async () => {
    const { result, client } = setup();

    act(() => client.setQueryData(showKeys.deck("c1", "d1"), deck(T2, [slide(1), slide(2)])));
    await waitFor(() => expect(result.current.draft.slides).toHaveLength(2));
    expect(result.current.dirty).toBe(false);

    act(() => result.current.dispatch({ type: "rename", title: "Моя" }));
    act(() => client.setQueryData(showKeys.deck("c1", "d1"), deck(T3, [slide(3)])));

    expect(result.current.draft.title).toBe("Моя");
    expect(result.current.draft.slides).toHaveLength(2);
  });

  it("правки під час збереження не губляться і лишаються незбереженими; дзеркальний URL переходить у незмінений слайд", async () => {
    let resolve: (d: SlideDeck) => void = () => undefined;

    vi.mocked(saveDeck).mockReturnValueOnce(new Promise((r) => (resolve = r)));

    const { result } = setup();

    act(() => result.current.dispatch({ type: "rename", title: "Нова" }));

    let pending: Promise<boolean> = Promise.resolve(false);

    act(() => void (pending = result.current.save()));
    act(() => result.current.dispatch({ type: "update", id: "slide-0001", patch: { caption: "Ніч" } }));

    await act(async () => {
      resolve({ ...deck(T2, [{ id: "slide-0001", imageUrl: "https://store/1.webp" }]), title: "Нова" });
      await pending;
    });

    expect(result.current.draft).toEqual({ title: "Нова", slides: [{ id: "slide-0001", imageUrl: "https://store/1.webp", caption: "Ніч" }] });
    expect(result.current.dirty).toBe(true);

    act(() => result.current.dispatch({ type: "update", id: "slide-0001", patch: { caption: undefined } }));
    expect(result.current.dirty).toBe(false);
  });

  it("правка, повернута вручну, — не dirty", () => {
    const { result } = setup();

    act(() => result.current.dispatch({ type: "rename", title: "Нова" }));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.dispatch({ type: "rename", title: "Таверна" }));
    expect(result.current.dirty).toBe(false);
  });

  it("409 без власних правок — тихо береться версія сервера", async () => {
    vi.mocked(saveDeck).mockRejectedValueOnce(conflict());
    vi.mocked(getDeck).mockResolvedValueOnce(deck(T2, [slide(2)]));

    const { result, notify } = setup();

    let ok = false;

    await act(async () => void (ok = await result.current.save()));
    expect(ok).toBe(true);
    expect(notify).not.toHaveBeenCalled();
    expect(result.current.draft.slides).toEqual([slide(2)]);
    expect(result.current.dirty).toBe(false);
  });

  it("409 з правками, «так» — один повтор поверх свіжого updatedAt", async () => {
    vi.mocked(saveDeck).mockRejectedValueOnce(conflict()).mockResolvedValueOnce({ ...deck(T3), title: "Моя" });
    vi.mocked(getDeck).mockResolvedValueOnce(deck(T2, [slide(2)]));

    const { result, notify } = setup();

    act(() => result.current.dispatch({ type: "rename", title: "Моя" }));

    let ok = false;

    await act(async () => void (ok = await result.current.save()));
    expect(ok).toBe(true);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Набір змінено в іншому місці. Зберегти ваші зміни поверх?" }));
    expect(vi.mocked(saveDeck).mock.calls[1][2]).toEqual({ title: "Моя", slides: [slide(1)], expectedUpdatedAt: T2 });
    expect(result.current.dirty).toBe(false);
  });

  it("409 з правками, «ні» — правки відкинуто, версія сервера, повідомлення", async () => {
    vi.mocked(saveDeck).mockRejectedValueOnce(conflict());
    vi.mocked(getDeck).mockResolvedValueOnce(deck(T2, [slide(2)]));

    const { result, notify } = setup(deck(T1), false);

    act(() => result.current.dispatch({ type: "rename", title: "Моя" }));

    let ok = true;

    await act(async () => void (ok = await result.current.save()));
    expect(ok).toBe(false);
    expect(saveDeck).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(result.current.draft).toEqual({ title: "Таверна", slides: [slide(2)] });
    expect(result.current.dirty).toBe(false);
  });
});
