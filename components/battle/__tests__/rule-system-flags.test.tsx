// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { MyHeroPanel } from "@/components/battle/participants/MyHeroPanel";
import { ParticipantDetails } from "@/components/battle/participants/ParticipantDetails";
import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { ReactionSpellButton } from "@/components/battle/turn/ReactionSpellButton";
import { ReadiedAttackButton } from "@/components/battle/turn/ReadiedAttackButton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParticipantSide } from "@/lib/constants/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { render } from "@/lib/i18n/test/render-uk";
import type { RuleSystemKey } from "@/lib/utils/rules/systems";

vi.unmock("next-intl");

const scene = (system?: RuleSystemKey) => fakeScene({ system, knownSpells: ["shield"] });

const list = (system?: RuleSystemKey) => {
  const { wrapper } = scene(system);

  render(<TooltipProvider><ParticipantList side={ParticipantSide.ALLY} /></TooltipProvider>, { wrapper });
};

describe("прапорці системи правил у HUD бою", () => {
  afterEach(cleanup);

  it("ParticipantList: AC лише для d20, підпис Рани лише для wfrp", () => {
    list();
    expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Рани/)).toBeNull();
    cleanup();

    list("wfrp");
    expect(screen.queryByText("12")).toBeNull();
    expect(screen.getByText("Рани 20 / 20")).toBeTruthy();
  });

  it("ParticipantDetails: секція Броня лише для d20", () => {
    for (const [system, armor, wounds] of [[undefined, true, false], ["wfrp", false, true]] as const) {
      const { wrapper, me } = scene(system);

      render(<TooltipProvider><ParticipantDetails participant={me} /></TooltipProvider>, { wrapper });
      expect(!!screen.queryByText("Броня")).toBe(armor);
      expect(!!screen.queryByText("Рани 20 / 20")).toBe(wounds);
      cleanup();
    }
  });

  it("MyHeroPanel: AC і Рани у повному та компактному вигляді", () => {
    for (const compact of [false, true]) {
      const d20 = scene();

      render(<MyHeroPanel hero={d20.me} compact={compact} />, { wrapper: d20.wrapper });
      expect(screen.queryByText(/Рани/)).toBeNull();
      expect(document.body.textContent).toMatch(compact ? /AC 12/ : /20 \/ 20/);
      cleanup();

      const wfrp = scene("wfrp");

      render(<MyHeroPanel hero={wfrp.me} compact={compact} />, { wrapper: wfrp.wrapper });
      expect(screen.getByText(/Рани 20 \/ 20/)).toBeTruthy();
      expect(document.body.textContent).not.toMatch(/AC \d/);
      cleanup();
    }
  });

  it("ReactionSpellButton і ReadiedAttackButton не рендеряться без реакції", () => {
    const { wrapper, me } = scene("wfrp");

    const { container } = render(<><ReactionSpellButton participant={me} /><ReadiedAttackButton participant={me} /></>, { wrapper });

    expect(container.textContent).toBe("");
  });
});
