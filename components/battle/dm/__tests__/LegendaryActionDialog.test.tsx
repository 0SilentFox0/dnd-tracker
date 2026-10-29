// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

vi.mock("@/lib/hooks/spells", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/hooks/spells")>(), useSpells: () => ({ data: [] }), useSpellsByIds: () => ({ data: [{ id: "fear", name: "Страх", level: 1, targeting: { kind: "enemy" }, dice: 0, cost: "action" }] }), usePrefetchSpellsByIds: () => undefined }));

import { LegendaryActionDialog } from "@/components/battle/dm/LegendaryActionDialog";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { render } from "@/lib/i18n/test/render-uk";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleParticipant } from "@/types/battle";

vi.unmock("next-intl");

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

 it("linked attack asks for its target; linked spell opens the regular spell dialog", () => {
  const { wrapper, dragon } = sceneWithDragon(true);

  dragon.battleData.resolvedAbilities = [resolved({ id: "pounce", name: "Pounce", trigger: { event: "action" }, limits: { legendaryCost: 2 }, perform: { kind: "attack", attack: "Рапіра" }, effects: [{ kind: "note", text: "Move" }] }), resolved({ id: "ray", name: "Ray", trigger: { event: "action" }, limits: { legendaryCost: 1 }, perform: { kind: "spell", spellId: "fear" }, effects: [{ kind: "note", text: "Spell" }] })];
  render(<LegendaryActionDialog participant={dragon} onClose={vi.fn()} />, { wrapper });
  fireEvent.click(screen.getByRole("radio", { name: /Pounce → Рапіра/ }));
  expect(screen.getByRole("radio", { name: "Фрейда" })).toBeTruthy();
  fireEvent.click(screen.getByRole("radio", { name: /Ray → Страх/ }));
  fireEvent.click(screen.getByRole("button", { name: "Виконати" }));
  expect(screen.getByRole("dialog", { name: /Книга заклинань|До списку/ })).toBeTruthy();
 });

it("offers lair actions independently of legendary budget and sends kind lair", async () => {
  const { wrapper, dragon, coreAction } = sceneWithDragon(false);

  dragon.battleData.legendary = { actions: 3, actionsLeft: 0, resistLeft: 0 };
  dragon.battleData.lair = { active: true, baseResistances: 0, resistSpent: 0 };
  dragon.battleData.resolvedAbilities = [resolved({ id: "fog", name: "Туман лігва", trigger: { event: "action" }, limits: { lair: true }, effects: [{ kind: "changeMorale", delta: 1 }] })];
  render(<LegendaryActionDialog participant={dragon} onClose={vi.fn()} />, { wrapper });
  fireEvent.click(screen.getByRole("radio", { name: /Туман лігва/ }));
  fireEvent.click(screen.getByRole("button", { name: "Виконати" }));
  await waitFor(() => expect(coreAction).toHaveBeenCalledWith(expect.objectContaining({ option: { kind: "lair", abilityKey: dragon.battleData.resolvedAbilities[0].key } })));
});
