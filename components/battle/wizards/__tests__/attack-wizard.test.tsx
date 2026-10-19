// @vitest-environment happy-dom
import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { AttackWizard } from "@/components/battle/wizards/AttackWizard";
import { AttackType } from "@/lib/constants/battle";
import { useAttackWizard } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleAttack } from "@/types/battle";

function Harness({ attacker, preset }: { attacker: Parameters<typeof useAttackWizard>[0]; preset?: { targetId: string; attackId: string } }) {
  const wizard = useAttackWizard(attacker);

  useEffect(() => wizard.actions.open(preset?.targetId, preset?.attackId), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <AttackWizard wizard={wizard} />;
}

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
    const { wrapper, me } = fakeScene();

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

  it("дальня вибрана зброя — підпис «Дальня атака», одна зброя — без «Змінити зброю»", async () => {
    const { wrapper, me } = fakeScene();

    const bow = { id: "bow", name: "Лук", type: AttackType.RANGED, range: "60 ft", attackBonus: 4, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

    render(<Harness attacker={{ ...me, battleData: { ...me.battleData, attacks: [bow] } }} preset={{ targetId: "gob", attackId: "bow" }} />, { wrapper });

    expect(await screen.findByText("Дальня атака")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Змінити зброю" })).toBeNull();
  });
});
