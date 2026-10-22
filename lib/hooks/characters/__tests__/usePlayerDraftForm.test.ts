// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDraftPortraits } from "@/lib/api/characters";
import { usePlayerDraftForm } from "@/lib/hooks/characters/usePlayerDraftForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/lib/api/characters", () => ({
  createDraft: vi.fn(),
  updateDraft: vi.fn(),
  generateBackstory: vi.fn(),
  generateDraftAvatar: vi.fn(),
  getBackstoryAvailability: vi.fn().mockResolvedValue({ available: false, image: false }),
  getDraftPortraits: vi.fn(),
}));

vi.mock("@/lib/hooks/races", () => ({ useRaces: () => ({ data: [{ name: "Люди" }, { name: "Орки" }] }) }));

const setup = (initial?: "generate") => {
  const client = new QueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);

  return renderHook(() => usePlayerDraftForm({ campaignId: "c1", initial }), { wrapper });
};

describe("usePlayerDraftForm", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
  });

  it("generate.all fills the form with a valid standard array", () => {
    const { result } = setup();

    act(() => result.current.generate.all());

    expect(result.current.form.values.name).not.toBe("");
    expect(["Люди", "Орки"]).toContain(result.current.form.values.race);
    expect(result.current.form.method).toBe("standard");
    expect(result.current.scoreStatus.valid).toBe(true);
  });

  it("auto-generates once with initial=generate", () => {
    const { result } = setup("generate");

    expect(result.current.form.values.name).not.toBe("");
  });

  it("setMethod(pointBuy) resets scores to 8", () => {
    const { result } = setup();

    act(() => result.current.form.setMethod("pointBuy"));

    expect(result.current.form.values.strength).toBe(8);
    expect(result.current.scoreStatus.spent).toBe(0);
  });

  it("standard mode: choosing a taken value swaps it with its holder", () => {
    const { result } = setup();

    const { strength, dexterity } = result.current.form.values;

    act(() => result.current.form.setScore("strength", dexterity));

    expect(result.current.form.values.strength).toBe(dexterity);
    expect(result.current.form.values.dexterity).toBe(strength);
    expect(result.current.scoreStatus.valid).toBe(true);
  });

  it("flags over-budget point-buy", () => {
    const { result } = setup();

    act(() => result.current.form.setMethod("pointBuy"));
    act(() => result.current.form.setScore("strength", 16));

    expect(result.current.scoreStatus.valid).toBe(false);
  });

  describe("generate.portrait", () => {
    it("picks a portrait from the race pool", async () => {
      vi.mocked(getDraftPortraits).mockResolvedValue({ portraits: ["https://x/a.webp", "https://x/b.webp"] });

      const { result } = setup();

      act(() => result.current.form.set("race", "Люди"));
      await waitFor(() => {
        act(() => result.current.generate.portrait());
        expect(result.current.form.values.avatar).toMatch(/^https:\/\/x\/[ab]\.webp$/);
      });
    });

    it("empty pool leaves the avatar unchanged", async () => {
      vi.mocked(getDraftPortraits).mockResolvedValue({ portraits: [] });

      const { result } = setup();

      act(() => result.current.form.set("avatar", "https://x/own.png"));
      act(() => result.current.form.set("race", "Люди"));
      await waitFor(() => expect(getDraftPortraits).toHaveBeenCalled());
      act(() => result.current.generate.portrait());

      expect(result.current.form.values.avatar).toBe("https://x/own.png");
    });
  });
});
