// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DmCharacterCard } from "../DmCharacterCard";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { CharacterListItem } from "@/types/characters";

const h = vi.hoisted(() => ({ rules: null as unknown }));

vi.mock("@/lib/hooks/campaigns", async (orig) => ({ ...(await orig<object>()), useCampaignRules: () => ({ data: h.rules }) }));
vi.mock("@/lib/hooks/classes", () => ({ useClassMode: () => ({ enabled: false, byId: {}, classes: [], pending: false }) }));

const hero = { id: "a", name: "Ліра", campaignId: "c", type: "player", controlledBy: "u", level: 1, class: "Воїн", race: "Людина", constitution: 10, armorClass: 12, initiative: 0, experience: 300, inspiration: true, resources: { hp: 3 } } as CharacterListItem;

const show = () => render(<DmCharacterCard character={hero} campaignId="c" busy={false} actions={{ onDelete: () => {} }} />);

describe("DmCharacterCard: out of combat", () => {
  afterEach(cleanup);

  it("HOMM rules: no rest badges", () => {
    h.rules = DEFAULT_RULES;
    show();

    expect(screen.queryByText("✦")).toBeNull();
    expect(screen.queryByText("characters.card.levelReady")).toBeNull();
  });

  it("all toggles on: current HP, inspiration, level-up badge", () => {
    h.rules = { ...DEFAULT_RULES, outOfCombat: { persistResources: true, longRestHitDice: "half", xp: true, inspiration: true } };
    show();

    expect(screen.getByLabelText("HP").textContent).toContain("3");
    expect(screen.getByText("✦")).toBeTruthy();
    expect(screen.getByText("characters.card.levelReady")).toBeTruthy();
  });
});
