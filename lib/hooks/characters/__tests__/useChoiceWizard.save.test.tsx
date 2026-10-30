// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { useChoiceWizard } from "@/lib/hooks/characters/useChoiceWizard";
import { featsById, refs, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import type { ChoicesState } from "@/types/choices";

const api = vi.hoisted(() => ({ putCharacterChoices: vi.fn() }));

vi.mock("@/lib/api/characters", () => api);
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const wrefs = { ...refs, ready: true, feats: Object.values(featsById), spells: [] } as unknown as ChoiceRefs & { ready: boolean };

const initial: ChoicesState = { raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 3 }] };

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>;

const setup = () => renderHook(() => useChoiceWizard({ campaignId: "c", characterId: "h", initial, hero: { level: 3, scores, skills: {}, classMode: true }, refs: wrefs as never }), { wrapper });

describe("useChoiceWizard next with the real save pipeline", () => {
  beforeEach(() => {
    api.putCharacterChoices.mockReset().mockResolvedValue({ id: "h" });
  });

  afterEach(cleanup);

  it("sends one PUT with the choices body and only then advances", async () => {
    const { result } = setup();

    expect(result.current.steps.length).toBeGreaterThan(1);

    await act(() => result.current.next());

    expect(api.putCharacterChoices).toHaveBeenCalledTimes(1);
    expect(api.putCharacterChoices).toHaveBeenCalledWith("c", "h", expect.objectContaining({ raceChoices: {}, feats: [], classChoices: { [sorcerer.id]: {} } }));
    expect(result.current.index).toBe(1);
  });

  it("a failed PUT keeps the step and surfaces the error", async () => {
    api.putCharacterChoices.mockRejectedValue(new ApiError("boom", 400, "/x", { error: "boom" }));

    const { result } = setup();

    await act(() => result.current.next());

    expect(api.putCharacterChoices).toHaveBeenCalledTimes(1);
    expect(result.current.index).toBe(0);
    expect(result.current.error).toBe("boom");
  });
});
