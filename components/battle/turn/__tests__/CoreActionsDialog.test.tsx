// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CoreActionsDialog } from "../CoreActionsDialog";
import { ReadiedAttackButton } from "../ReadiedAttackButton";

import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { render } from "@/lib/i18n/test/render-uk";
import { CORE_ACTION_KEYS, CORE_ACTION_REGISTRY } from "@/lib/utils/battle/actions/registry";
import { applyCondition5e } from "@/lib/utils/battle/conditions";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

vi.unmock("next-intl");

const used = (p: BattleParticipant): BattleParticipant => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: true } });

const setup = (over: (p: BattleParticipant) => BattleParticipant = (p) => p) => {
  const scene = fakeScene();

  const hero = over(scene.me);

  const onOpenChange = vi.fn();

  const onDone = vi.fn();

  const ui = render(<CoreActionsDialog participant={hero} open onOpenChange={onOpenChange} onDone={onDone} />, { wrapper: scene.wrapper });

  return { ...scene, hero, onOpenChange, onDone, ui };
};

const row = (label: string) => screen.getByRole("radio", { name: new RegExp(label) }) as HTMLButtonElement;

describe("CoreActionsDialog", () => {
  afterEach(cleanup);

  it("показує всі дії з вартістю й описом", () => {
    setup();

    for (const k of CORE_ACTION_KEYS) {
      expect(screen.getByText(CORE_ACTION_REGISTRY[k].label)).toBeTruthy();
      expect(screen.getByText(CORE_ACTION_REGISTRY[k].description)).toBeTruthy();
    }

    expect(screen.getAllByText("Дія").length).toBeGreaterThan(0);
    expect(screen.getByText("Рух")).toBeTruthy();
  });

  it("недоступні дії вимкнені з причиною", () => {
    setup(used);

    expect(row("Ривок").disabled).toBe(true);
    expect(screen.getAllByText("Дію вже витрачено").length).toBeGreaterThan(0);
    expect(row("Підвестися").disabled).toBe(true);
    expect(screen.getByText("Ви не лежите")).toBeTruthy();
  });

  it("дія без цілі відправляється одразу тілом {action, participantId}", async () => {
    const { coreAction, onOpenChange, onDone } = setup();

    fireEvent.click(row("Ривок"));
    fireEvent.click(screen.getByRole("button", { name: "Виконати" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(coreAction).toHaveBeenCalledWith({ action: "dash", participantId: "me" });
    expect(onDone).toHaveBeenCalled();
  });

  it("ціль обов'язкова; вороги для схоплення, союзники для допомоги", async () => {
    const { coreAction } = setup();

    fireEvent.click(row("Схопити"));
    expect((screen.getByRole("button", { name: "Виконати" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("radio", { name: "Годрік" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Гоблін" }));
    fireEvent.click(screen.getByRole("button", { name: "Виконати" }));

    await waitFor(() => expect(coreAction).toHaveBeenCalledWith({ action: "grapple", participantId: "me", targetId: "gob" }));

    fireEvent.click(row("Допомога"));
    expect(screen.queryByRole("radio", { name: "Гоблін" })).toBeNull();
    expect(screen.getByRole("radio", { name: "Годрік" })).toBeTruthy();
  });

  it("штовхання має вибір «Повалити / Відштовхнути»", async () => {
    const { coreAction } = setup();

    fireEvent.click(row("Штовхнути"));
    fireEvent.click(screen.getByRole("radio", { name: "Відштовхнути" }));
    fireEvent.click(screen.getByRole("radio", { name: "Гоблін" }));
    fireEvent.click(screen.getByRole("button", { name: "Виконати" }));

    await waitFor(() => expect(coreAction).toHaveBeenCalledWith({ action: "shove", participantId: "me", targetId: "gob", mode: "push" }));
  });

  it("лежачий може підвестися", () => {
    setup((p) => applyCondition5e([p], "me", { key: "prone", rounds: 99, permanent: true, round: 1, source: { participantId: "x", name: "X" }, sourceName: "X", timedKey: "test:prone" }).participants[0]);

    expect(row("Підвестися").disabled).toBe(false);
    expect(row("Вирватися").disabled).toBe(true);
    expect(screen.getByText("Ви не схоплені")).toBeTruthy();
  });

  it("схоплений може вирватися", () => {
    setup((p) => applyCondition5e([p], "me", { key: "grappled", rounds: 99, permanent: true, round: 1, source: { participantId: "x", name: "X" }, sourceName: "X", timedKey: "test:grappled" }).participants[0]);

    expect(row("Вирватися").disabled).toBe(false);
  });
});

describe("ReadiedAttackButton", () => {
  afterEach(cleanup);

  const enabled = (over: Partial<BattleParticipant["battleData"]> = {}, reaction = false) => {
    const scene = fakeScene();

    scene.battle.rules = { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } };

    const hero = { ...scene.me, battleData: { ...scene.me.battleData, readied: { kind: "attack" as const, round: 3 }, ...over }, actionFlags: { ...scene.me.actionFlags, hasUsedReaction: reaction } };

    return { ...scene, hero };
  };

  it("з'являється лише при readied і невитраченій реакції та вмикає атаку по цілі", async () => {
    const { hero, wrapper, coreAction } = enabled();

    render(<ReadiedAttackButton participant={hero} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Підготовлена атака/ }));
    fireEvent.click(screen.getByRole("button", { name: "Гоблін" }));

    await waitFor(() => expect(coreAction).toHaveBeenCalledWith({ action: "readiedAttack", participantId: "me", targetId: "gob" }));
  });

  it("не показується без readied, з витраченою реакцією або при вимкнених правилах", () => {
    const none = enabled({ readied: undefined });

    render(<ReadiedAttackButton participant={none.hero} />, { wrapper: none.wrapper });
    expect(screen.queryByRole("button", { name: /Підготовлена атака/ })).toBeNull();
    cleanup();

    const spent = enabled({}, true);

    render(<ReadiedAttackButton participant={spent.hero} />, { wrapper: spent.wrapper });
    expect(screen.queryByRole("button", { name: /Підготовлена атака/ })).toBeNull();
    cleanup();

    const off = fakeScene();

    render(<ReadiedAttackButton participant={{ ...off.me, battleData: { ...off.me.battleData, readied: { kind: "attack", round: 3 } } }} />, { wrapper: off.wrapper });
    expect(screen.queryByRole("button", { name: /Підготовлена атака/ })).toBeNull();
  });
});
