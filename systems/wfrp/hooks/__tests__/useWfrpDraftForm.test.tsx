// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWfrpDraftForm } from "../useWfrpDraftForm";

import { mulberry32 } from "@/lib/utils/common/rng";
import { DEFAULT_ADVANCEMENT_RULES } from "@/lib/utils/rules/advancement";
import { createWfrpDraft, updateWfrpDraftIdentity } from "@/systems/wfrp/api/characters";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/systems/wfrp/api/characters", () => ({ createWfrpDraft: vi.fn().mockResolvedValue({}), updateWfrpDraftIdentity: vi.fn().mockResolvedValue({}) }));

vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { system: { key: "wfrp" }, advancement: DEFAULT_ADVANCEMENT_RULES } }) }));

vi.mock("@/lib/hooks/careers", () => ({ useCareers: () => ({ data: [{ id: "ca", name: "A" }, { id: "cb", name: "B" }] }) }));

vi.mock("@/lib/hooks/feats", () => ({ useFeats: () => ({ data: [{ id: "f0", name: "F0" }, { id: "f1", name: "F1" }] }) }));

const profile = {
  mods: { ws: 5 },
  move: 4,
  fate: 2,
  extraWounds: 0,
  talents: ["f0"],
  randomTalentCount: 2,
  randomTalents: [{ max: 100, featId: "f1" }],
  careerTable: [
    { max: 50, careerId: "ca" },
    { max: 100, careerId: "cb" },
  ],
};

vi.mock("@/lib/hooks/races", () => ({
  useRaces: () => ({ data: [{ id: "r1", name: "Human" }, { id: "r2", name: "Elf" }], isPending: false }),
}));
vi.mock("@/systems/wfrp/hooks/useRaceProfiles", () => ({
  useRaceProfiles: () => ({ data: [{ raceId: "r1", profile }, { raceId: "r2", profile: { ...profile, careerTable: [] } }], isPending: false }),
}));

const setup = (extra: Partial<Parameters<typeof useWfrpDraftForm>[0]> = {}) => {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

  return renderHook(() => useWfrpDraftForm({ campaignId: "c1", rng: mulberry32(7), ...extra }), { wrapper });
};

describe("useWfrpDraftForm", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    push.mockReset();
    vi.mocked(createWfrpDraft).mockClear();
    vi.mocked(updateWfrpDraftIdentity).mockClear();
  });

  it("lists only species with a usable profile", () => {
    const { result } = setup();

    expect(result.current.species.data.map((s) => s.race.id)).toEqual(["r1"]);
  });

  it("blocks Next until the step is valid", () => {
    const { result } = setup();

    expect(result.current.step).toMatchObject({ id: "species", canNext: false });

    act(() => result.current.species.select("r1"));

    expect(result.current.step.canNext).toBe(true);

    act(() => result.current.step.next());

    expect(result.current.step).toMatchObject({ id: "career", index: 1, canNext: false });

    act(() => result.current.career.roll());

    expect(result.current.career.rolls).toHaveLength(2);
    expect(result.current.step.canNext).toBe(true);

    act(() => result.current.career.pick("zzz"));

    expect(result.current.step.canNext).toBe(false);
  });

  it("rolled career is the first roll, auto-picked, and cannot be rerolled", () => {
    const { result } = setup();

    act(() => result.current.species.select("r1"));
    act(() => result.current.step.next());
    act(() => result.current.career.roll());

    const rolls = result.current.career.rolls;

    expect(result.current.career.careerId).toBe(rolls[0].careerId);
    expect(result.current.step.canNext).toBe(true);

    act(() => result.current.career.pick("zzz"));
    expect(result.current.step.canNext).toBe(false);

    act(() => result.current.career.roll());
    expect(result.current.career.rolls).toEqual(rolls);
  });

  it("choice mode picks only among the two rolls and mode switches fix the pick", () => {
    const { result } = setup();

    act(() => result.current.species.select("r1"));
    act(() => result.current.career.roll());

    const rolls = result.current.career.rolls;

    act(() => result.current.step.next());
    act(() => result.current.career.setMode("choice"));
    expect(result.current.career.careerId).toBe(rolls[0].careerId);

    act(() => result.current.career.setMode("free"));
    act(() => result.current.career.pick("zzz"));
    act(() => result.current.career.setMode("choice"));
    expect(result.current.career.careerId).toBeUndefined();

    act(() => result.current.career.pick(rolls[1].careerId));
    expect(result.current.step.canNext).toBe(true);

    act(() => result.current.career.setMode("rolled"));
    expect(result.current.career.careerId).toBe(rolls[0].careerId);
  });

  it("stats and talents roll once; re-selecting the same species keeps the rolls", () => {
    const { result } = setup();

    act(() => result.current.species.select("r1"));
    act(() => result.current.stats.roll());
    act(() => result.current.talents.roll());

    const { rolls } = result.current.stats;

    const { rolled } = result.current.talents;

    act(() => result.current.stats.roll());
    act(() => result.current.talents.roll());
    act(() => result.current.stats.setMode("free"));
    act(() => result.current.stats.setMode("rolled"));
    act(() => result.current.species.select("r1"));

    expect(result.current.stats.rolls).toEqual(rolls);
    expect(result.current.talents.rolled).toEqual(rolled);
  });

  it("hides Next on the species step without usable species and explains unknown ids", () => {
    const { result } = setup();

    expect(result.current.step.hideNext).toBe(false);
    expect(result.current.stepErrors("career")).toEqual([]);
  });

  it("rolls stats deterministically and rearranging changes the experience bonus", () => {
    const first = setup().result;

    act(() => first.current.species.select("r1"));
    act(() => first.current.stats.roll());

    const rolls = first.current.stats.rolls;

    expect(rolls).toHaveLength(10);

    const second = setup().result;

    act(() => second.current.species.select("r1"));
    act(() => second.current.stats.roll());

    expect(second.current.stats.rolls).toEqual(rolls);

    act(() => second.current.career.setMode("choice"));
    act(() => second.current.career.pick("ca"));
    act(() => second.current.talents.roll());

    expect(second.current.preview).toMatchObject({ ok: true, experience: 25 + 50 });

    act(() => second.current.stats.setMode("rearranged"));
    act(() => second.current.stats.swap(0, 1));

    expect(second.current.stats.arranged[0]).toBe(rolls[1]);
    expect(second.current.preview).toMatchObject({ ok: true, experience: 25 + 25 });
  });

  it("free points with a wrong budget make the preview invalid", () => {
    const { result } = setup();

    act(() => result.current.species.select("r1"));
    act(() => result.current.stats.setMode("free"));
    act(() => result.current.stats.setPoint(0, 12));

    expect(result.current.preview?.ok).toBe(false);

    act(() => result.current.stats.setPoint(0, 10));
    act(() => result.current.career.setMode("choice"));
    act(() => result.current.career.pick("ca"));
    act(() => result.current.talents.roll());

    expect(result.current.preview?.ok).toBe(true);
  });

  it("submits the exact WfrpDraftInput and navigates", async () => {
    const { result } = setup();

    act(() => result.current.species.select("r1"));
    act(() => result.current.career.setMode("choice"));
    act(() => result.current.career.pick("cb"));
    act(() => result.current.stats.setMode("free"));
    act(() => result.current.talents.roll());
    act(() => result.current.identity.set({ name: " Hans ", background: "b" }));

    expect(result.current.submit.canRun).toBe(true);

    await act(async () => result.current.submit.run());

    expect(createWfrpDraft).toHaveBeenCalledWith("c1", {
      name: "Hans",
      background: "b",
      speciesId: "r1",
      career: { mode: "choice", careerId: "cb" },
      stats: { mode: "free", points: Array(10).fill(10) },
      talents: result.current.talents.rolled,
    });
    expect(push).toHaveBeenCalledWith("/campaigns/c1/character");
  });

  it("identity-only mode patches the identity", async () => {
    const { result } = setup({ characterId: "ch1", initialIdentity: { name: "Old" } });

    expect(result.current.step).toMatchObject({ id: "identity", total: 1, canNext: true });

    act(() => result.current.identity.set({ name: "New" }));

    await act(async () => result.current.submit.run());

    expect(updateWfrpDraftIdentity).toHaveBeenCalledWith("c1", "ch1", { name: "New" });
    expect(createWfrpDraft).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/campaigns/c1/character");
  });

  it("drops a legacy alignment from the submitted identity", async () => {
    const { result } = setup({ characterId: "ch1", initialIdentity: { name: "Old", alignment: "lawful good" } });

    await act(async () => result.current.submit.run());

    expect(updateWfrpDraftIdentity).toHaveBeenCalledWith("c1", "ch1", { name: "Old" });
  });
});
