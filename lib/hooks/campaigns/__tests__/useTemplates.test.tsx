// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getTemplates } from "@/lib/api/templates";
import { SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { useTemplates, useTemplateSelection } from "@/lib/hooks/campaigns";
import { campaignKeys } from "@/lib/hooks/campaigns/keys";

vi.mock("@/lib/api/templates", () => ({ getTemplates: vi.fn() }));

const list = { official: [{ id: "o1", name: "Heroes", description: null, visibility: "official", counts: {} }], mine: [] };

const setup = () => {
  const client = new QueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return { client, wrapper };
};

describe("useTemplates", () => {
  it("кешує під campaignKeys.templates()", async () => {
    vi.mocked(getTemplates).mockResolvedValue(list);

    const { client, wrapper } = setup();

    const { result } = renderHook(() => useTemplates(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(list));
    expect(client.getQueryData(campaignKeys.templates())).toEqual(list);
  });

  it("за замовчуванням — без шаблону", async () => {
    vi.mocked(getTemplates).mockResolvedValue(list);

    const { result } = renderHook(() => useTemplateSelection(), { wrapper: setup().wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selection).toEqual({ templateId: null });
    expect(result.current.name).toBeUndefined();
  });

  it("якщо є офіційний порожній 5e — він вибраний за замовчуванням, явний вибір має пріоритет", async () => {
    vi.mocked(getTemplates).mockResolvedValue({ ...list, official: [...list.official, { id: "e5", name: "5e (empty)", description: null, visibility: "official", counts: {} }] });

    const { result } = renderHook(() => useTemplateSelection(), { wrapper: setup().wrapper });

    await waitFor(() => expect(result.current.selection).toEqual({ templateId: "e5" }));
    expect(result.current.name).toBe("5e (empty)");

    act(() => result.current.setSelection({ templateId: null }));
    expect(result.current.selection).toEqual({ templateId: null });
  });

  it("resolves SRD content language once and discards stale locale for private, empty and file sources", async () => {
    const canonical = { ...list.official[0], id: "srd", kind: "template", templateKey: SRD_TEMPLATE_NAME, availableLocales: ["en", "uk"], locale: "en" };

    vi.mocked(getTemplates).mockResolvedValue({ official: [canonical], mine: [{ ...canonical, id: "private", visibility: "private" }] });

    const { result } = renderHook(() => useTemplateSelection(), { wrapper: setup().wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSelection({ templateId: "srd" }));
    expect(result.current.selection).toEqual({ templateId: "srd", contentLocale: "uk" });
    act(() => result.current.setSelection({ templateId: "srd", contentLocale: "en" }));
    expect(result.current.selection).toEqual({ templateId: "srd", contentLocale: "en" });
    act(() => result.current.setSelection({ templateId: "private", contentLocale: "uk" }));
    expect(result.current.selection).toEqual({ templateId: "private" });
    act(() => result.current.setSelection({ templateId: null, contentLocale: "uk" }));
    expect(result.current.selection).toEqual({ templateId: null });

    const file = { name: "campaign.json", bundle: {}, entities: 1 };

    act(() => result.current.setSelection({ file, contentLocale: "uk" }));
    expect(result.current.selection).toEqual({ file });
  });
});
