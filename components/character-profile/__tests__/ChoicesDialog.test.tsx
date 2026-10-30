// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ChoicesDialog from "@/components/character-profile/ChoicesDialog";
import { featsById, refs, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";

const mocks = vi.hoisted(() => ({ ready: true, enabled: [] as (boolean | undefined)[] }));

vi.mock("@/lib/hooks/characters", () => ({
  useCharacter: () => ({ data: { race: "Elf", level: 3, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, skills: {}, classes: [{ classId: "cls-sorc", level: 3 }] } }),
  useChoiceRefs: (_c: string, _r: string, opts?: { enabled?: boolean }) => (mocks.enabled.push(opts?.enabled), { ...refs, race: null, ready: mocks.ready, feats: Object.values(featsById), spells: [], classesById: { [sorcerer.id]: { ...sorcerer, subclasses: [{ id: "s1", name: "Draconic", features: [] }] } } }),
}));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { classes: { enabled: true } } }) }));
vi.mock("@/components/choices/ChoiceWizard", () => ({ ChoiceWizard: (p: { startAt?: string }) => <div data-testid="wizard">{p.startAt ?? "none"}</div> }));

describe("ChoicesDialog", () => {
  afterEach(cleanup);

  it("passes startAt to the wizard", () => {
    render(<ChoicesDialog open onOpenChange={() => {}} campaignId="c" characterId="h" startAt="subclass" />);

    expect(screen.getByTestId("wizard").textContent).toBe("subclass");
  });

  it("does not enable the ref queries while closed", () => {
    mocks.enabled = [];

    render(<ChoicesDialog open={false} onOpenChange={() => {}} campaignId="c" characterId="h" />);

    expect(mocks.enabled.length).toBeGreaterThan(0);
    expect(mocks.enabled.every((e) => e === false)).toBe(true);
  });

  it("shows loading until refs are ready", () => {
    mocks.ready = false;

    render(<ChoicesDialog open onOpenChange={() => {}} campaignId="c" characterId="h" />);

    expect(screen.queryByTestId("wizard")).toBeNull();
    mocks.ready = true;
  });
});
