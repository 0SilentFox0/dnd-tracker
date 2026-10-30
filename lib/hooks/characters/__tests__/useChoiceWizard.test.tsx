// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChoiceWizard } from "@/lib/hooks/characters/useChoiceWizard";
import { featsById, refs, rogue, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import type { ChoicesState } from "@/types/choices";

const mocks = vi.hoisted(() => ({ save: vi.fn(), error: null as string | null }));

vi.mock("@/lib/hooks/characters/useCharacterChoices", () => ({ useCharacterChoices: () => ({ save: mocks.save, isPending: false, error: mocks.error, issues: [], clear: vi.fn() }) }));

const draconic = { id: "sub-dr", name: "Draconic", features: [{ level: 3, abilities: [], choices: [{ id: "ancestry", label: "Ancestry", level: 3, count: 1, kind: "option" as const, options: [{ id: "red", name: "Red", abilities: [] }] }] }] };

const wrefs = { ...refs, ready: true, feats: Object.values(featsById), spells: [], classesById: { ...refs.classesById, [sorcerer.id]: { ...sorcerer, subclasses: [draconic] } } } as ChoiceRefs & { ready: boolean; feats: never[]; spells: never[] };

const hero = { level: 3, scores, skills: {}, classMode: true };

const initial: ChoicesState = { raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 3 }] };

const setup = (over: { initial?: ChoicesState; startAt?: string; onFinish?: () => void; refs?: unknown } = {}) =>
  renderHook(() => useChoiceWizard({ campaignId: "c", characterId: "h", initial: over.initial ?? initial, hero, refs: (over.refs ?? wrefs) as never, startAt: over.startAt, onFinish: over.onFinish }));

describe("useChoiceWizard", () => {
  beforeEach(() => {
    mocks.save.mockReset().mockResolvedValue(true);
    mocks.error = null;
  });

  afterEach(cleanup);

  it("startAt picks the step by its key, default is the first", () => {
    const first = setup();

    expect(first.result.current.index).toBe(0);

    const at = setup({ startAt: first.result.current.steps[2].key });

    expect(at.result.current.index).toBe(2);
  });

  it("startAt background without any backgrounds in the campaign shows no step", () => {
    const { result } = setup({ startAt: "background" });

    expect(result.current.step).toBeUndefined();
  });

  it("startAt background opens the background step when backgrounds exist", () => {
    const bg = { id: "bg", name: "Sage", icon: null, description: null, choices: [], skillProficiencies: [], toolProficiencies: [], originFeatId: null, equipmentText: null };

    const { result } = setup({ startAt: "background", refs: { ...wrefs, backgroundsById: { bg } } });

    expect(result.current.step?.key).toBe("background");
  });

  it("startAt with a scoped key lands on that class's step in a multiclass hero", () => {
    const multi: ChoicesState = { raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 3 }, { classId: rogue.id, level: 3 }] };

    const all = setup({ initial: multi }).result.current.steps;

    const key = `classes.${rogue.id}.expertise-1`;

    expect(all.some((s) => s.key === key)).toBe(true);
    expect(setup({ initial: multi, startAt: key }).result.current.step?.key).toBe(key);
  });

  it("startAt subclass lands on the subclass step", () => {
    const { result } = setup({ startAt: `subclass:${sorcerer.id}` });

    expect(result.current.step?.kind).toBe("subclass");
  });

  it("next saves once and moves on", async () => {
    const { result } = setup();

    await act(() => result.current.next());

    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(result.current.index).toBe(1);
  });

  it("failed save stays on the step and keeps the pick", async () => {
    mocks.save.mockResolvedValue(false);
    mocks.error = "boom";

    const { result } = setup();

    const step = result.current.step!;

    await act(() => result.current.next());

    expect(result.current.index).toBe(0);
    expect(result.current.step?.key).toBe(step.key);
    expect(result.current.error).toBe("boom");
  });

  it("picking a subclass adds new steps, keeps shown ones and does not reset the number", async () => {
    const { result } = setup({ startAt: `subclass:${sorcerer.id}` });

    const before = result.current.steps.length;

    const at = result.current.index;

    act(() => result.current.state.set({ ...result.current.state.data, classes: [{ classId: sorcerer.id, level: 3, subclassId: "sub-dr" }] }));

    await act(() => result.current.next());

    expect(result.current.steps.length).toBe(before + 1);
    expect(result.current.index).toBe(at + 1);
    expect(result.current.steps.some((s) => s.choice?.id === "ancestry")).toBe(true);
    expect(result.current.steps.some((s) => s.kind === "subclass")).toBe(true);
  });

  it("back does not save", async () => {
    const { result } = setup();

    await act(() => result.current.next());
    act(() => result.current.back());

    expect(result.current.index).toBe(0);
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it("last step: next calls onFinish after a successful save", async () => {
    const onFinish = vi.fn();

    const { result } = setup({ onFinish });

    const total = result.current.steps.length;

    for (let i = 0; i < total; i++) await act(() => result.current.next());

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(result.current.index).toBe(total - 1);
  });

  it("done when nothing is open", () => {
    const { result } = setup({ initial: { raceChoices: {}, feats: [], classes: [] }, refs: { ...wrefs, race: null } });

    expect(result.current.steps.length).toBe(0);
    expect(result.current.done).toBe(true);
  });
});
