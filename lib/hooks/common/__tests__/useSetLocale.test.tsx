// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSetLocale } from "../useSetLocale";

import { localeApi } from "@/lib/api/locale";
import { LOCALE_CHANGE_EVENT } from "@/lib/i18n/client-locale-provider";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api/locale", () => ({ localeApi: { set: vi.fn().mockResolvedValue({ locale: "en" }) } }));

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
});
