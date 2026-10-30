// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTimeZoneSetting } from "../useTimeZoneSetting";

import { localeApi } from "@/lib/api/locale";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api/locale", () => ({ localeApi: { get: vi.fn(), set: vi.fn() } }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(localeApi.get).mockResolvedValue({ locale: "en", timeZone: "Asia/Tokyo" });
  vi.mocked(localeApi.set).mockResolvedValue({});
});

describe("useTimeZoneSetting", () => {
  it("reads the profile zone and saves a change through localeApi.set", async () => {
    const { result } = renderHook(() => useTimeZoneSetting(), { wrapper });

    await waitFor(() => expect(result.current.timeZone).toBe("Asia/Tokyo"));

    await act(() => result.current.set("America/New_York"));

    expect(localeApi.set).toHaveBeenCalledWith({ timeZone: "America/New_York" });
    expect(refresh).toHaveBeenCalled();
  });

  it("null resets to automatic", async () => {
    const { result } = renderHook(() => useTimeZoneSetting(), { wrapper });

    await act(() => result.current.set(null));

    expect(localeApi.set).toHaveBeenCalledWith({ timeZone: null });
  });
});
