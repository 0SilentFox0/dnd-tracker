// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSetLocale } from "../useSetLocale";

import { localeApi } from "@/lib/api/locale";
import { LOCALE_CHANGE_EVENT } from "@/lib/i18n/config";

const refresh = vi.fn();

const assign = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api/locale", () => ({ localeApi: { set: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(localeApi.set).mockResolvedValue({ locale: "en" });
  vi.stubGlobal("location", { ...window.location, assign, protocol: "http:" });
  document.cookie = "NEXT_LOCALE=; max-age=0; path=/";
});

afterEach(() => vi.unstubAllGlobals());

describe("useSetLocale", () => {
  it("зберігає мову, сповіщає провайдер і оновлює маршрут", async () => {
    const onChange = vi.fn();

    window.addEventListener(LOCALE_CHANGE_EVENT, onChange);

    const { result } = renderHook(() => useSetLocale());

    await act(() => result.current.set("en"));

    expect(localeApi.set).toHaveBeenCalledWith("en");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalled();
    window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
  });

  it("з hardNavigateTo робить повне завантаження, а не router.push", async () => {
    const { result } = renderHook(() => useSetLocale());

    await act(() => result.current.set("en", "/"));

    expect(assign).toHaveBeenCalledWith("/");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("при падінні PUT ставить cookie і все одно переходить", async () => {
    vi.mocked(localeApi.set).mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useSetLocale());

    await act(() => result.current.set("uk", "/uk"));

    expect(document.cookie).toContain("NEXT_LOCALE=uk");
    expect(assign).toHaveBeenCalledWith("/uk");
  });
});
