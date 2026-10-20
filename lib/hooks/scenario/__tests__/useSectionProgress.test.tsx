// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/scenario";
import { scenarioKeys, useSectionProgress } from "@/lib/hooks/scenario";
import type { ScenarioPage } from "@/types/scenario";

vi.mock("@/lib/api/scenario", () => ({ patchScenarioSection: vi.fn() }));

const section = { id: "s1", title: "Собор", played: false, rows: [] };

const page: ScenarioPage = { id: "p1", kind: "scene", arc: null, title: "t", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 1, updatedAt: "", content: { legend: [], sections: [section] } };

describe("useSectionProgress", () => {
  it("кладе розділ і версію з відповіді в кеш сторінки", async () => {
    const client = new QueryClient();

    client.setQueryData(scenarioKeys.page("c", "p1"), page);
    vi.mocked(api.patchScenarioSection).mockResolvedValue({ version: 2, section: { ...section, played: true } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useSectionProgress("c", "p1"), { wrapper });

    await act(async () => result.current.setPlayed("s1", true));

    const cached = client.getQueryData<ScenarioPage>(scenarioKeys.page("c", "p1"));

    expect(cached?.version).toBe(2);
    expect(cached?.content.sections[0].played).toBe(true);
  });
});
