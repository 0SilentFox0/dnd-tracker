// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getTemplates } from "@/lib/api/templates";
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
});
