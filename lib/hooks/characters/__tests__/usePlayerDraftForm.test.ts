// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDraftPortraitPools } from "@/lib/api/characters";
import { usePlayerDraftForm } from "@/lib/hooks/characters/usePlayerDraftForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/lib/api/characters", () => ({
  createDraft: vi.fn(),
  updateDraft: vi.fn(),
  generateBackstory: vi.fn(),
  generateDraftAvatar: vi.fn(),
  getBackstoryAvailability: vi.fn().mockResolvedValue({ available: false, image: false }),
  getDraftPortraitPools: vi.fn(),
}));

vi.mock("@/lib/hooks/races", () => ({ useRaces: () => ({ data: [{ name: "Люди" }, { name: "Орки" }] }) }));

const classMode = vi.hoisted(() => ({ value: { enabled: false, classes: [] as unknown[], pending: false } }));

vi.mock("@/lib/hooks/classes", () => ({ useClassMode: () => classMode.value }));

const setup = (initial?: "generate") => {
  const client = new QueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);

  return renderHook(() => usePlayerDraftForm({ campaignId: "c1", initial }), { wrapper });
};

describe("usePlayerDraftForm", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.mocked(getDraftPortraitPools).mockReset().mockResolvedValue({ pools: {} });
  });

  it("class mode: generate.all picks a campaign class and needs no archetype select", () => {
    classMode.value = { enabled: true, classes: [{ id: "k1", name: "Бард-тест", spellcastingAbility: "charisma", savingThrows: ["dexterity", "charisma"] }], pending: false };

    const { result } = setup();

    act(() => result.current.generate.all());

    expect(result.current.form.classes?.list).toHaveLength(1);
    expect(result.current.form.values).toMatchObject({ classId: "k1", class: "Бард-тест", charisma: 15, dexterity: 14, primaryAbility: "charisma" });

    classMode.value = { enabled: false, classes: [], pending: false };
  });

  it("generate.all fills the form with a valid standard array", () => {
    const { result } = setup();

    act(() => result.current.generate.all());

    expect(result.current.form.values.name).not.toBe("");
    expect(["Люди", "Орки"]).toContain(result.current.form.values.race);
    expect(result.current.form.method).toBe("standard");
    expect(result.current.scoreStatus.valid).toBe(true);
  });

  it("auto-generates once with initial=generate after the portrait pools load", async () => {
    const { result } = setup("generate");

    await waitFor(() => expect(result.current.form.values.name).not.toBe(""));
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
    it("generate.all includes the avatar once pools are prefetched", async () => {
      vi.mocked(getDraftPortraitPools).mockResolvedValue({ pools: { Люди: ["https://x/a.webp"], Орки: ["https://x/b.webp"] } });

      const { result } = setup();

      act(() => result.current.form.set("race", "Люди"));
      await waitFor(() => expect(result.current.generate.canPortrait).toBe(true));
      act(() => result.current.generate.all());

      expect(result.current.form.values.avatar).toMatch(/^https:\/\/x\/[ab]\.webp$/);
    });

    it("picks a portrait from the race pool", async () => {
      vi.mocked(getDraftPortraitPools).mockResolvedValue({ pools: { Люди: ["https://x/a.webp", "https://x/b.webp"] } });

      const { result } = setup();

      act(() => result.current.form.set("race", "Люди"));
      await waitFor(() => expect(result.current.generate.canPortrait).toBe(true));
      await waitFor(() => {
        act(() => result.current.generate.portrait());
        expect(result.current.form.values.avatar).toMatch(/^https:\/\/x\/[ab]\.webp$/);
      });
    });

    it("empty pool leaves the avatar unchanged", async () => {
      vi.mocked(getDraftPortraitPools).mockResolvedValue({ pools: {} });

      const { result } = setup();

      act(() => result.current.form.set("avatar", "https://x/own.png"));
      act(() => result.current.form.set("race", "Люди"));
      await waitFor(() => expect(getDraftPortraitPools).toHaveBeenCalled());
      expect(result.current.generate.canPortrait).toBe(false);
      act(() => result.current.generate.portrait());

      expect(result.current.form.values.avatar).toBe("https://x/own.png");
    });
  });
});
