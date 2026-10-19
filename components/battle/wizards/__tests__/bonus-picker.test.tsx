// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { BonusActionPicker } from "@/components/battle/wizards/BonusActionPicker";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { ResolvedAbility } from "@/types/abilities";

const heal = { key: "heal", name: "Лікувальний дотик", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: "1d8", target: "eventTarget" }], source: { type: "skill", id: "s", name: "S" } } as ResolvedAbility;

const wind = { key: "wind", name: "Друге дихання", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: "1d10" }], source: { type: "skill", id: "s2", name: "S2" } } as ResolvedAbility;

const dive = { key: "dive", name: "Пікірування", trigger: { event: "action" }, aim: { kind: "cell", range: 120 }, effects: [{ kind: "maneuver", maneuver: "dive", percentOfAttack: 200 }], source: { type: "unit", id: "g", name: "G" } } as ResolvedAbility;

const squall = { key: "squall", name: "Шквал", trigger: { event: "action" }, aim: { kind: "direction", range: 15 }, effects: [{ kind: "maneuver", maneuver: "squall", percentOfAttack: 100 }], source: { type: "unit", id: "g", name: "G" } } as ResolvedAbility;

const MAP = testMap();

describe("BonusActionPicker", () => {
  it("уміння без цілі — одразу відправка", async () => {
    const { wrapper, me, bonusAction } = fakeScene({ abilities: [wind] });

    render(<BonusActionPicker participant={me} open onOpenChange={() => {}} onDone={() => {}} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Друге дихання/ }));

    await waitFor(() => expect(bonusAction).toHaveBeenCalledWith({ participantId: me.basicInfo.id, abilityKey: "wind" }));
  });

  it("лікування на ціль — список союзників, потім відправка з targetParticipantId", async () => {
    const { wrapper, me, ally, bonusAction } = fakeScene({ abilities: [heal] });

    render(<BonusActionPicker participant={me} open onOpenChange={() => {}} onDone={() => {}} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Лікувальний дотик/ }));
    expect(screen.queryByRole("button", { name: /Гоблін/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(ally.basicInfo.name) }));

    await waitFor(() => expect(bonusAction).toHaveBeenCalledWith({ participantId: me.basicInfo.id, abilityKey: "heal", targetParticipantId: ally.basicInfo.id }));
  });

  it("маневр без карти — список ворогів", async () => {
    const { wrapper, me, gob, abilityAction } = fakeScene({ abilities: [dive] });

    render(<BonusActionPicker participant={me} trigger="action" open onOpenChange={() => {}} onDone={() => {}} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Пікірування/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));

    await waitFor(() => expect(abilityAction).toHaveBeenCalledWith({ participantId: me.basicInfo.id, abilityKey: "dive", targetParticipantIds: [gob.basicInfo.id] }));
  });

  describe("наведення на карту", () => {
    const setup = (ability: ResolvedAbility = dive) => {
      const scene = fakeScene({ abilities: [ability], map: MAP });

      const me = { ...scene.me, battleData: { ...scene.me.battleData, position: { x: 1, y: 1 } } };

      render(<BonusActionPicker participant={me} trigger="action" open onOpenChange={() => {}} onDone={() => {}} />, { wrapper: scene.wrapper });

      fireEvent.click(screen.getByRole("button", { name: new RegExp(ability.name) }));

      const setMapAim = scene.value.intents.setMapAim as unknown as ReturnType<typeof vi.fn>;

      return { ...scene, me, setMapAim };
    };

    it("клік по клітинці відправляє targetCell", async () => {
      const { me, setMapAim, abilityAction } = setup();

      const aim = setMapAim.mock.calls[0][0];

      expect(aim).toMatchObject({ casterId: me.basicInfo.id, range: 120 });

      act(() => aim.onAim({ x: 5, y: 5 }));

      await waitFor(() => expect(abilityAction).toHaveBeenCalledWith({ participantId: me.basicInfo.id, abilityKey: "dive", targetCell: { x: 5, y: 5 } }));
      expect(setMapAim).toHaveBeenLastCalledWith(null);
    });

    it("клітинкове вміння показує куб, напрямкове — лінію на дальність", async () => {
      expect(setup().setMapAim.mock.calls[0][0].template).toMatchObject({ shape: "cube" });
      cleanup();

      const direction = setup(squall);

      const aim = direction.setMapAim.mock.calls[0][0];

      expect(aim.template).toEqual({ shape: "line", size: 15 });

      act(() => aim.onAim({ x: 9, y: 9 }));
      expect(direction.abilityAction).not.toHaveBeenCalled();

      act(() => aim.onAim({ x: 3, y: 1 }));
      await waitFor(() => expect(direction.abilityAction).toHaveBeenCalledWith({ participantId: direction.me.basicInfo.id, abilityKey: "squall", targetCell: { x: 3, y: 1 } }));
    });

    it("«Скасувати» прибирає наведення", () => {
      const { setMapAim, abilityAction } = setup();

      expect(screen.getByRole("region", { name: "Наведення вміння", hidden: true })).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Скасувати", hidden: true }));

      expect(setMapAim).toHaveBeenLastCalledWith(null);
      expect(screen.queryByRole("region", { name: "Наведення вміння", hidden: true })).toBeNull();
      expect(abilityAction).not.toHaveBeenCalled();
    });

    it("Escape прибирає наведення", () => {
      const { setMapAim } = setup();

      fireEvent.keyDown(window, { key: "Escape" });

      expect(setMapAim).toHaveBeenLastCalledWith(null);
      expect(screen.queryByRole("region", { name: "Наведення вміння", hidden: true })).toBeNull();
    });
  });
});
