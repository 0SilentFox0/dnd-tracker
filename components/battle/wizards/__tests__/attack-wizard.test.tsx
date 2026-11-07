// @vitest-environment happy-dom
import { useEffect } from "react";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

vi.mock("next-intl", async () => (await import("./uk-intl")).catalogIntl());

import { AttackWizard } from "@/components/battle/wizards/AttackWizard";
import { AttackType } from "@/lib/constants/battle";
import { useAttackWizard } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { render } from "@/lib/i18n/test/render-uk";
import type { BattleAttack } from "@/types/battle";

vi.unmock("next-intl");

function Harness({ attacker, preset }: { attacker: Parameters<typeof useAttackWizard>[0]; preset?: { targetId: string; attackId: string } }) {
  const wizard = useAttackWizard(attacker);

  useEffect(() => wizard.actions.open(preset?.targetId, preset?.attackId), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button type="button" onClick={wizard.actions.close}>test-close</button>
      <button type="button" onClick={() => wizard.actions.open(preset?.targetId, preset?.attackId)}>test-open</button>
      <AttackWizard wizard={wizard} />
    </>
  );
}

afterEach(cleanup);

const reopen = () => {
  fireEvent.click(screen.getByRole("button", { name: "test-close", hidden: true }));
  fireEvent.click(screen.getByRole("button", { name: "test-open", hidden: true }));
};

describe("AttackWizard", () => {
  it("ціль → сітка d20 → шкода → підсумок «Атакувати» → мутація", async () => {
    const { wrapper, me, mutateAsync } = fakeScene();

    render(<Harness attacker={me} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидок" }));
    fireEvent.click(screen.getByRole("button", { name: "14" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d8)"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));

    expect(screen.getByText("Захист і опори цілі")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Атакувати/ }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ attackRoll: 14, damageRolls: [6] })));
  });

  it("Авто-кидок ставить кидок і переходить далі", async () => {
    const { wrapper, me } = fakeScene();

    render(<Harness attacker={me} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидок" }));
    fireEvent.click(screen.getByRole("button", { name: /Авто-кидок/ }));

    await waitFor(() => expect(screen.queryByText("Кидок атаки · d20")).toBeNull());
  });

  it("вибрані зброя й ціль: підпис ближньої атаки, «Змінити зброю» веде до вибору зброї з тією ж ціллю", async () => {
    const { wrapper, me, gob } = fakeScene({ map: { cols: 6, rows: 4, background: null, opacity: 0.3 } });

    me.battleData.position = { x: 0, y: 0 };
    gob.battleData.position = { x: 1, y: 0 };

    const bow = { id: "bow", name: "Лук", type: AttackType.RANGED, range: "60 ft", attackBonus: 4, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

    const archer = { ...me, battleData: { ...me.battleData, attacks: [...me.battleData.attacks, bow] } };

    render(<Harness attacker={archer} preset={{ targetId: "gob", attackId: "rapier" }} />, { wrapper });

    expect(await screen.findByText("Ближня атака · ціль поруч")).toBeTruthy();
    expect(screen.getByText("Кидок атаки · d20")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Змінити зброю" }));
    fireEvent.click(screen.getByRole("button", { name: /Лук/ }));

    expect(screen.getByRole("button", { name: /Гоблін/ }).className).toContain("border-[var(--enemy)]");
    expect(screen.queryByText("Ближня атака · ціль поруч")).toBeNull();
  });

  it("ціль поза дальністю атаки вимкнена з поясненням", async () => {
    const { wrapper, me, gob } = fakeScene({ map: { cols: 20, rows: 4, background: null, opacity: 0.3 } });

    me.battleData.position = { x: 0, y: 0 };
    gob.battleData.position = { x: 15, y: 0 };

    const bow = { id: "bow", name: "Лук", type: AttackType.RANGED, range: "30 ft", attackBonus: 4, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

    render(<Harness attacker={{ ...me, battleData: { ...me.battleData, attacks: [bow] } }} preset={{ attackId: "bow", targetId: "" }} />, { wrapper });

    const target = await screen.findByRole("button", { name: /Гоблін/ });

    expect((target as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Ціль поза дальністю атаки")).toBeTruthy();
  });

  it("помилка сервера видна на кроці кидка", async () => {
    const { wrapper, me, mutateAsync } = fakeScene();

    mutateAsync.mockRejectedValueOnce(new Error("Ціль поза дальністю атаки"));

    render(<Harness attacker={me} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидок" }));
    fireEvent.click(screen.getByRole("button", { name: "14" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d8)"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Атакувати/ }));

    expect((await screen.findByRole("alert")).textContent).toBe("Ціль поза дальністю атаки");
  });

  it("без карти дальність не перевірено — лише «Ближня атака»", async () => {
    const { wrapper, me } = fakeScene();

    render(<Harness attacker={me} preset={{ targetId: "gob", attackId: "rapier" }} />, { wrapper });

    expect(await screen.findByText("Ближня атака")).toBeTruthy();
    expect(screen.queryByText(/ціль поруч/)).toBeNull();
  });

  it("дальня вибрана зброя — підпис «Дальня атака», одна зброя — без «Змінити зброю»", async () => {
    const { wrapper, me } = fakeScene();

    const bow = { id: "bow", name: "Лук", type: AttackType.RANGED, range: "60 ft", attackBonus: 4, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

    render(<Harness attacker={{ ...me, battleData: { ...me.battleData, attacks: [bow] } }} preset={{ targetId: "gob", attackId: "bow" }} />, { wrapper });

    expect(await screen.findByText("Дальня атака")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Змінити зброю" })).toBeNull();
  });

  it("WFRP: лічильник набоїв на зброї, кнопка вимкнена коли порожньо або перезарядка", async () => {
    const { wrapper, me } = fakeScene();

    const bow = { id: "bow", name: "Лук", type: AttackType.RANGED, range: "60 ft", attackBonus: 4, damageDice: "1d6", damageType: "piercing", wfrp: { qualities: [], flaws: [], ammoCapacity: 3, reload: 1 } } as BattleAttack;

    const withAmmo = (battleData: Partial<typeof me.battleData>) => ({ ...me, battleData: { ...me.battleData, attacks: [...me.battleData.attacks, bow], ...battleData } });

    const first = render(<Harness attacker={withAmmo({ ammo: { bow: 2 } })} />, { wrapper });

    const button = await screen.findByRole("button", { name: /Лук/ });

    expect(button.textContent).toContain("Набої 2/3");
    expect((button as HTMLButtonElement).disabled).toBe(false);
    first.unmount();

    const empty = render(<Harness attacker={withAmmo({ ammo: { bow: 0 } })} />, { wrapper });

    expect(((await screen.findByRole("button", { name: /Лук/ })) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Лук/ }).textContent).toContain("Немає набоїв");
    empty.unmount();

    render(<Harness attacker={withAmmo({ ammo: { bow: 0 }, reload: { bow: 1 } })} />, { wrapper });

    expect((await screen.findByRole("button", { name: /Лук/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Лук/ }).textContent).toContain("Перезарядка");
  });

  it("закриття й повторне відкриття не залишає старих кубиків шкоди", async () => {
    const { wrapper, me } = fakeScene();

    render(<Harness attacker={me} preset={{ targetId: "gob", attackId: "rapier" }} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: "14" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d8)"), { target: { value: "6" } });

    expect((screen.getByRole("button", { name: "Далі · підсумок" }) as HTMLButtonElement).disabled).toBe(false);

    reopen();
    fireEvent.click(await screen.findByRole("button", { name: "14" }));

    expect((screen.getByLabelText("Кубик 1 (d8)") as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("button", { name: "Далі · підсумок" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("перший кубик переваги не переживає закриття діалогу", async () => {
    const { wrapper, me, mutateAsync } = fakeScene();

    render(<Harness attacker={me} preset={{ targetId: "gob", attackId: "rapier" }} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Перевага" }));
    fireEvent.click(screen.getByRole("button", { name: "14" }));

    reopen();
    fireEvent.click(await screen.findByRole("button", { name: "Перевага" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(screen.getByText("Кидок атаки · d20")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("wfrp: d100-кидок без сітки d20 і режимів, ціль і Momentum видно, ручний 73 іде з кубиками шкоди", async () => {
    const { wrapper, me, mutateAsync } = fakeScene({ system: "wfrp", momentum: { ally: true } });

    render(<Harness attacker={me} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: /Далі · кидок/ }));

    expect(screen.getByText("Кидок атаки · d100")).toBeTruthy();
    expect(screen.getByText(/Ціль \d+%/)).toBeTruthy();
    expect(screen.getByText("Momentum: ваша сторона")).toBeTruthy();
    expect(screen.getByText(/Шкода зброї: d\d+/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Перевага" })).toBeNull();
    expect(screen.queryByRole("button", { name: "14" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ручний" }));
    fireEvent.change(screen.getByLabelText("1–100"), { target: { value: "73" } });
    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;

    expect(payload).toMatchObject({ attackRoll: 73 });
    expect((payload.damageRolls as number[]).length).toBeGreaterThan(0);
  });

  it("wfrp: без Momentum показує «Momentum немає», авто-кидок відправляє d100", async () => {
    const { wrapper, me, mutateAsync } = fakeScene({ system: "wfrp" });

    render(<Harness attacker={me} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: /Далі · кидок/ }));

    expect(screen.getByText("Momentum немає")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Авто-кидок/ }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;

    expect(payload).toMatchObject({ serverRoll: true });
    expect(payload).not.toHaveProperty("attackRoll");
  });
});
