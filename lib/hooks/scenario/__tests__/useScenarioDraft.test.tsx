// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/scenario";
import { useScenarioDraft } from "@/lib/hooks/scenario";
import type { ScenarioPage } from "@/types/scenario";

vi.mock("@/lib/api/scenario", () => ({ saveScenarioContent: vi.fn(), getScenarioPage: vi.fn() }));

const page: ScenarioPage = { id: "p1", kind: "scene", arc: null, title: "t", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 1, updatedAt: "", content: { legend: [], sections: [] } };

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

const rename = (title: string) => (c: ScenarioPage["content"]) => ({ ...c, legend: [{ kind: "read" as const, label: title }] });

describe("useScenarioDraft", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("debounce 1.5 с і один PUT з expectedVersion", async () => {
    vi.mocked(api.saveScenarioContent).mockResolvedValue({ version: 2 });

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    act(() => result.current.setContent(rename("ab")));
    expect(result.current.state).toBe("dirty");

    await act(async () => vi.advanceTimersByTimeAsync(1500));

    expect(api.saveScenarioContent).toHaveBeenCalledTimes(1);
    expect(api.saveScenarioContent).toHaveBeenCalledWith("c", "p1", { expectedVersion: 1, content: rename("ab")(page.content) });
    expect(result.current.state).toBe("saved");
  });

  it("правка під час збереження йде другим PUT з новою версією", async () => {
    let resolveFirst: (v: { version: number }) => void = () => {};

    vi.mocked(api.saveScenarioContent).mockImplementationOnce(() => new Promise((r) => (resolveFirst = r))).mockResolvedValueOnce({ version: 3 });

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    act(() => result.current.setContent(rename("ab")));
    await act(async () => resolveFirst({ version: 2 }));
    await act(async () => vi.advanceTimersByTimeAsync(1500));

    expect(api.saveScenarioContent).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.saveScenarioContent).mock.calls[1][2]).toEqual({ expectedVersion: 2, content: rename("ab")(page.content) });
    expect(result.current.content.legend[0].label).toBe("ab");
  });

  it("409 → conflict, локальні зміни лишаються, далі PUT не шлються до reload", async () => {
    vi.mocked(api.saveScenarioContent).mockRejectedValue(new ApiError("conflict", 409, "/x"));

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    await act(async () => vi.advanceTimersByTimeAsync(1500));

    expect(result.current.state).toBe("conflict");
    expect(result.current.content.legend[0].label).toBe("a");

    act(() => result.current.setContent(rename("ab")));
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    await act(async () => result.current.flush());

    expect(api.saveScenarioContent).toHaveBeenCalledTimes(1);
    expect(result.current.content.legend[0].label).toBe("ab");
  });

  it("flush чекає PUT, що вже летить, і дозберігає хвіст", async () => {
    let resolveFirst: (v: { version: number }) => void = () => {};

    vi.mocked(api.saveScenarioContent).mockImplementationOnce(() => new Promise((r) => (resolveFirst = r))).mockResolvedValueOnce({ version: 3 });

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    act(() => result.current.setContent(rename("ab")));

    let done = false;

    const flushing = act(async () => {
      await result.current.flush();
      done = true;
    });

    expect(done).toBe(false);
    resolveFirst({ version: 2 });
    await flushing;

    expect(api.saveScenarioContent).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe("saved");
  });

  it("мережева помилка → error, flush повторює", async () => {
    vi.mocked(api.saveScenarioContent).mockRejectedValueOnce(new Error("net")).mockResolvedValueOnce({ version: 2 });

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    expect(result.current.state).toBe("error");

    await act(async () => result.current.flush());
    expect(result.current.state).toBe("saved");
  });
});
