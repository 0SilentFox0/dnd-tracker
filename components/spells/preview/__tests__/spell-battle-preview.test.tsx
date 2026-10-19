// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fx = vi.hoisted(() => ({ value: { enabled: true, userEnabled: true, motionAllowed: true, setEnabled: () => {} } }));

const playFx = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("@/lib/hooks/battle/useFxEnabled", () => ({ useFxEnabled: () => fx.value }));
vi.mock("@/components/battle/fx/runtime/play", () => ({ playFx }));
vi.mock("@/components/battle/fx/runtime/stage", () => ({ cancelLayer: vi.fn() }));
vi.mock("@/components/battle/fx/auras/canvas/AuraCanvas", () => ({
  AuraCanvas: ({ kinds, still }: { kinds: string[]; still?: boolean }) => <span data-testid="aura" data-kinds={kinds.join(",")} data-still={String(!!still)} />,
}));
vi.mock("@/components/battle/fx/frames/canvas/CanvasFrame", () => ({ CanvasFrame: () => <span data-testid="hit-frame" /> }));

import SpellBattlePreviewPanel from "@/components/spells/preview/SpellBattlePreviewPanel";
import { SPELLS } from "@/data/library/spells";
import { libraryPreviewSpell, type PreviewSpell } from "@/lib/utils/battle/fx/spell-preview";

function spellNamed(name: string): PreviewSpell {
  const s = SPELLS.find((x) => x.name === name);

  if (!s) throw new Error(name);

  return libraryPreviewSpell(s);
}

const plague = spellNamed("Чума");

describe("SpellBattlePreviewPanel", () => {
  afterEach(cleanup);

  beforeEach(() => {
    playFx.mockClear();
    fx.value = { enabled: true, userEnabled: true, motionAllowed: true, setEnabled: () => {} };
  });

  it("FX off: only the chips line, no arena and no replay", () => {
    fx.value = { ...fx.value, enabled: false, userEnabled: false };
    render(<SpellBattlePreviewPanel spell={plague} />);

    expect(screen.queryByTestId("spell-preview-arena")).toBeNull();
    expect(screen.getByText("Чума")).toBeTruthy();
    expect(screen.getByText("Отрута")).toBeTruthy();
    expect(screen.getByText("Мор")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Показати ще раз/ })).toBeNull();
    expect(playFx).not.toHaveBeenCalled();
  });

  it("plays once on open, then leaves the aura on the target; replay plays again", async () => {
    render(<SpellBattlePreviewPanel spell={plague} />);

    const arena = screen.getByTestId("spell-preview-arena");

    expect(arena.querySelectorAll("[data-fx-participant]")).toHaveLength(2);
    expect(screen.queryByTestId("aura")).toBeNull();
    await act(async () => {});
    expect(playFx).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("aura").dataset.kinds).toBe("plague");

    fireEvent.click(screen.getByRole("button", { name: /Показати ще раз/ }));
    await act(async () => {});
    expect(playFx).toHaveBeenCalledTimes(2);
  });

  it("reduced motion: static aura, no animation", () => {
    fx.value = { ...fx.value, enabled: false, motionAllowed: false };
    render(<SpellBattlePreviewPanel spell={plague} />);

    expect(screen.getByTestId("aura").dataset.still).toBe("true");
    expect(screen.queryByTestId("hit-frame")).toBeNull();
    expect(playFx).not.toHaveBeenCalled();
  });

  it("a self spell shows only the caster", () => {
    render(<SpellBattlePreviewPanel spell={spellNamed("Аватар")} />);

    expect([...screen.getByTestId("spell-preview-arena").querySelectorAll("[data-fx-participant]")].map((e) => e.getAttribute("data-fx-participant"))).toEqual(["caster"]);
  });
});
