// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/api/skill-trees", () => ({
  updateSkillTree: vi.fn(async () => ({ id: "t1", campaignId: "c1", race: "Ельф", createdAt: "2026-10-05", skills: { mainSkills: [] } })),
}));

import { useSkillTreeSave } from "@/lib/hooks/skills";
import type { SkillTree } from "@/types/skill-tree";

afterEach(cleanup);

describe("useSkillTreeSave", () => {
  it("marks the cached skill trees stale so character views reload the edited tree", async () => {
    const client = new QueryClient();

    client.setQueryData(["skill-trees", "c1"], [{ id: "t1" }]);

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useSkillTreeSave({ campaignId: "c1" }), { wrapper });

    await act(() => result.current.saveSkillTree({ id: "t1", mainSkills: [] } as unknown as SkillTree));

    expect(client.getQueryState(["skill-trees", "c1"])?.isInvalidated).toBe(true);
  });
});
