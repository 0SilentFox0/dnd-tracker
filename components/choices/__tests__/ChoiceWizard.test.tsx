// @vitest-environment happy-dom
import { useEffect, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChoiceWizard } from "@/components/choices/ChoiceWizard";
import { SubclassCard } from "@/components/choices/SubclassCard";
import type { ChoiceRefsView } from "@/lib/hooks/characters";
import { featsById, refs, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { ChoicesState, FeatData } from "@/types/choices";
import type { GameClassData } from "@/types/classes";

const mocks = vi.hoisted(() => ({ save: vi.fn(), bump: () => {}, error: null as string | null }));

vi.mock("@/lib/hooks/characters/useCharacterChoices", () => ({ useCharacterChoices: () => ({ save: mocks.save, isPending: false, error: mocks.error, issues: [], clear: vi.fn() }) }));

const grip: FeatData = { id: "f-grip", name: "Grip", icon: null, type: "general", prerequisite: { scores: { abilities: ["strength"], min: 13 } }, repeatable: false, description: null, abilities: [], choices: [] };

const fighter: GameClassData = {
  ...sorcerer,
  id: "cls-fighter",
  name: "Fighter",
  caster: "none",
  spellcastingAbility: null,
  columns: [],
  subclassLevel: null,
  features: [
    { level: 1, abilities: [], choices: [{ id: "boost", label: "Boost", level: 1, count: 1, kind: "abilityScore", abilities: ["strength"], points: 1, max: 20 }] },
    { level: 1, abilities: [], choices: [{ id: "style", label: "Style", level: 1, count: 1, kind: "feat", featTypes: ["general"] }] },
    { level: 1, abilities: [], choices: [{ id: "pick", label: "Pick", level: 1, count: 1, kind: "option", options: [{ id: "a", name: "Option A", abilities: [] }] }] },
  ],
};

const draconic = { id: "sub-dr", name: "Draconic", features: [{ level: 3, abilities: [], description: "Dragon blood.", choices: [] }] };

const wrefs = { ...refs, ready: true, race: null, feats: [grip], spells: [], featsById: { ...featsById, [grip.id]: grip }, classesById: { [fighter.id]: fighter, [sorcerer.id]: { ...sorcerer, subclasses: [draconic] } } } as unknown as ChoiceRefsView;

const initial: ChoicesState = { raceChoices: {}, feats: [], classes: [{ classId: fighter.id, level: 1 }] };

function Harness({ startAt, onClose = () => {} }: { startAt?: string; onClose?: () => void }) {
  const [str, setStr] = useState(12);

  useEffect(() => {
    mocks.bump = () => setStr(13);
  }, []);

  return <ChoiceWizard campaignId="c" characterId="h" initial={initial} hero={{ level: 1, scores: { ...scores, strength: str }, skills: {}, classMode: true }} refs={wrefs} startAt={startAt} onClose={onClose} />;
}

describe("ChoiceWizard", () => {
  beforeEach(() => {
    mocks.save.mockReset().mockImplementation(async () => {
      mocks.bump();

      return true;
    });
    mocks.error = null;
  });

  afterEach(cleanup);

  it("shows the step number, source and what it gives", () => {
    render(<Harness />);

    expect(screen.getByText('choices.wizard.step {"n":1,"total":3}')).toBeTruthy();
    expect(screen.getByText('choices.wizard.source.classLevel {"name":"Fighter","level":1}')).toBeTruthy();
    expect(screen.getByText("choices.wizard.gives.abilityScore")).toBeTruthy();
  });

  it("a feat gated on STR 13 unlocks on the next step after the ability step is saved", async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /\+1 .*strength/ }));
    fireEvent.click(screen.getByRole("button", { name: "choices.wizard.next" }));

    await waitFor(() => expect(screen.getByText('choices.wizard.step {"n":2,"total":3}')).toBeTruthy());

    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio", { name: /Grip/ }).hasAttribute("disabled")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "choices.wizard.back" }));

    expect(screen.queryByText("13 → 14")).toBeNull();
  });

  it("failed save stays on the step and shows the error", async () => {
    mocks.save.mockResolvedValue(false);
    mocks.error = "boom";

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "choices.wizard.next" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("boom"));
    expect(screen.getByText('choices.wizard.step {"n":1,"total":3}')).toBeTruthy();
  });

  it("last step is Done and closes after saving", async () => {
    const onClose = vi.fn();

    render(<Harness startAt="pick" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "choices.wizard.finish" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("nothing open: empty state without a step counter or a pick button", () => {
    const empty = { ...wrefs, classesById: {} } as unknown as ChoiceRefsView;

    render(<ChoiceWizard campaignId="c" characterId="h" initial={{ raceChoices: {}, feats: [], classes: [] }} hero={{ level: 1, scores, skills: {}, classMode: true }} refs={empty} onClose={() => {}} />);

    expect(screen.getByText("choices.wizard.allChosen")).toBeTruthy();
    expect(screen.queryByText(/choices.wizard.step/)).toBeNull();
    expect(screen.queryByRole("button", { name: "choices.wizard.next" })).toBeNull();
  });

  it("subclass step picks a subclass and saves it with Next", async () => {
    render(<ChoiceWizard campaignId="c" characterId="h" initial={{ raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 3 }] }} hero={{ level: 3, scores, skills: {}, classMode: true }} refs={wrefs} startAt="subclass" onClose={() => {}} />);

    fireEvent.click(screen.getByRole("radio", { name: /Draconic/ }));
    fireEvent.click(screen.getByRole("button", { name: "choices.wizard.next" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0]![0].classSubclasses).toEqual({ [sorcerer.id]: "sub-dr" });
  });
});

describe("SubclassCard", () => {
  afterEach(cleanup);

  it("onChange receives the subclass id", () => {
    const onChange = vi.fn();

    render(<SubclassCard cls={{ ...sorcerer, subclasses: [draconic] }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /Draconic/ }));

    expect(onChange).toHaveBeenCalledWith("sub-dr");
  });

  it("marks the current value", () => {
    render(<SubclassCard cls={{ ...sorcerer, subclasses: [draconic] }} value="sub-dr" onChange={() => {}} />);

    expect(screen.getByRole("radio", { name: /Draconic/ }).getAttribute("aria-checked")).toBe("true");
  });
});
