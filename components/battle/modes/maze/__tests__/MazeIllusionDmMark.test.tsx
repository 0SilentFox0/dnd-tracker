// @vitest-environment happy-dom
import { type ReactNode } from "react";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { MazeViewProvider } from "../MazeViewProvider";

import { DmQuickActionsPanel } from "@/components/battle/dm/DmQuickActionsPanel";
import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { ParticipantSide } from "@/lib/constants/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { render } from "@/lib/i18n/test/render-uk";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";

vi.unmock("next-intl");

afterEach(cleanup);

const dialogs = { log: { open: false, setOpen: vi.fn(), show: vi.fn() }, addParticipant: { open: false, setOpen: vi.fn(), show: vi.fn() }, hp: { target: null, show: vi.fn(), close: vi.fn() } };

const panel = { open: true, onOpenChange: vi.fn() };

function dmScene() {
  const map = mazeMap({ illusionSwap: { pairs: [{ a: "me", b: "ally", aSees: { name: "Вампір" }, bSees: { name: "Верховний лич" } }] } }, 8, 6);

  const s = fakeScene({ isDM: true, map });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <s.wrapper>
      <MazeViewProvider>{children}</MazeViewProvider>
    </s.wrapper>
  );

  return { Wrapper };
}

describe("позначка підміни в інтерфейсі ДМ", () => {
  it("список учасників: обидва партнери з маскою", () => {
    const { Wrapper } = dmScene();

    render(<ParticipantList side={ParticipantSide.ALLY} />, { wrapper: Wrapper });

    expect(screen.getAllByLabelText("Підміна")).toHaveLength(2);
  });

  it("панель ДМ: рядки партнерів з маскою, гоблін без", () => {
    const { Wrapper } = dmScene();

    render(<DmQuickActionsPanel dialogs={dialogs} onOpenCastSpell={vi.fn()} panel={panel} />, { wrapper: Wrapper });

    expect(screen.getAllByLabelText("Підміна")).toHaveLength(2);
  });
});
