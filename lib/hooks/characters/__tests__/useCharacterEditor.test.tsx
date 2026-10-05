// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/characters", () => ({
  getCharacter: vi
    .fn()
    .mockResolvedValueOnce({ id: "ch1", name: "Арвен", level: 3, inventory: { equipped: { ring1: "a1" } } })
    .mockResolvedValue({ id: "ch1", name: "Арвен", level: 4, inventory: { equipped: { ring1: "a1" } } }),
  updateCharacter: vi.fn(async () => ({})),
  createCharacter: vi.fn(),
  getCharacters: vi.fn(async () => []),
  levelUpCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  deleteAllCharacters: vi.fn(),
}));
vi.mock("@/lib/api/campaigns", () => ({ getCampaignMembers: vi.fn(async () => []) }));
vi.mock("@/lib/api/races", () => ({ getRaces: vi.fn(async () => []) }));

import { useCharacterEditor } from "@/lib/hooks/characters";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

afterEach(cleanup);

describe("useCharacterEditor", () => {
  it("seeds the form once and keeps user edits across refetches", async () => {
    const { result } = renderHook(() => useCharacterEditor({ campaignId: "c1", characterId: "ch1", onSaved: vi.fn() }), { wrapper });

    await waitFor(() => expect(result.current.form.formData.basicInfo.name).toBe("Арвен"));
    expect(result.current.equipped).toEqual({ ring1: "a1" });

    act(() => result.current.form.setFormData((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, name: "Арвен II" } })));
    await act(() => client.invalidateQueries({ queryKey: ["character", "c1", "ch1"] }));
    await waitFor(() => expect(result.current.query.data?.level).toBe(4));

    expect(result.current.form.formData.basicInfo.name).toBe("Арвен II");
  });
});
