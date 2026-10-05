// @vitest-environment happy-dom
import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { AttackWizard } from "@/components/battle/wizards/AttackWizard";
import { useAttackWizard } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

function Harness({ attacker }: { attacker: Parameters<typeof useAttackWizard>[0] }) {
  const wizard = useAttackWizard(attacker);

  useEffect(() => wizard.open(), []); // eslint-disable-line react-hooks/exhaustive-deps

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

  it("AI ROLL ставить кидок і переходить далі", async () => {
    const { wrapper, me } = fakeScene();

    render(<Harness attacker={me} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидок" }));
    fireEvent.click(screen.getByRole("button", { name: /AI ROLL/ }));

    await waitFor(() => expect(screen.queryByText("Кидок атаки · d20")).toBeNull());
  });
});
