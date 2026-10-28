// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { LegendaryActionDialog } from "@/components/battle/dm/LegendaryActionDialog";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleParticipant } from "@/types/battle";

function sceneWithDragon(isMyTurn: boolean) {
  const scene = fakeScene({ isDM: true, isMyTurn });

  const dragon: BattleParticipant = { ...scene.gob, battleData: { ...scene.gob.battleData, legendary: { actions: 3, actionsLeft: 3, resistLeft: 1 } } };

  scene.value.battle = { ...scene.value.battle, initiativeOrder: [scene.me, dragon, scene.ally] };

  if (!isMyTurn) scene.value.turn = { ...scene.value.turn, current: dragon };

  return { ...scene, dragon };
}

afterEach(cleanup);

describe("LegendaryActionDialog", () => {
  it("атака: вибір атаки й цілі → core-action legendary", async () => {
    const { wrapper, dragon, coreAction } = sceneWithDragon(true);

    const onClose = vi.fn();

    render(<LegendaryActionDialog participant={dragon} onClose={onClose} />, { wrapper });

    fireEvent.click(screen.getByRole("radio", { name: /Рапіра/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Фрейда" }));
    fireEvent.click(screen.getByRole("button", { name: "Виконати" }));

    await waitFor(() => expect(coreAction).toHaveBeenCalledWith({ action: "legendary", participantId: "gob", option: { kind: "attack", attackIndex: 0, targetId: "me" } }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("у хід самого монстра варіанти заблоковані з причиною", () => {
    const { wrapper, dragon } = sceneWithDragon(false);

    render(<LegendaryActionDialog participant={dragon} onClose={vi.fn()} />, { wrapper });

    expect((screen.getByRole("radio", { name: /Рапіра/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Легендарна дія — лише поза своїм ходом")).toBeTruthy();
  });

  it("без цілі не можна виконати", () => {
    const { wrapper, dragon } = sceneWithDragon(true);

    render(<LegendaryActionDialog participant={dragon} onClose={vi.fn()} />, { wrapper });

    fireEvent.click(screen.getByRole("radio", { name: /Рапіра/ }));

    expect((screen.getByRole("button", { name: "Виконати" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
