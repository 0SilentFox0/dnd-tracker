// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { ChangeHpDialog } from "@/components/battle/dm/dialogs/ChangeHpDialog";
import { render } from "@/lib/i18n/test/render-uk";
import type { BattleParticipant } from "@/types/battle";

vi.unmock("next-intl");

afterEach(cleanup);

const hero = { basicInfo: { id: "h1", name: "Фрейда" }, combatStats: { currentHp: 12, maxHp: 30 } } as BattleParticipant;

const input = () => screen.getByLabelText(/Нове значення HP/) as HTMLInputElement;

const save = () => screen.getByRole("button", { name: /Зберегти|Зберігаємо/ }) as HTMLButtonElement;

describe("ChangeHpDialog", () => {
  it("зберігає значення, обмежене max HP, і не закривається сам", () => {
    const onConfirm = vi.fn();

    const onClose = vi.fn();

    render(<ChangeHpDialog participant={hero} onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.change(input(), { target: { value: "40" } });
    fireEvent.click(save());

    expect(onConfirm).toHaveBeenCalledWith("h1", 30);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("від'ємне чи порожнє значення не зберегти", () => {
    render(<ChangeHpDialog participant={hero} onClose={vi.fn()} onConfirm={vi.fn()} />);

    fireEvent.change(input(), { target: { value: "-3" } });

    expect(save().disabled).toBe(true);

    fireEvent.change(input(), { target: { value: "" } });

    expect(save().disabled).toBe(true);
  });

  it("під час мутації — «Зберігаємо…» і введене лишається", () => {
    const { rerender } = render(<ChangeHpDialog participant={hero} onClose={vi.fn()} onConfirm={vi.fn()} />);

    fireEvent.change(input(), { target: { value: "5" } });
    rerender(<ChangeHpDialog participant={hero} onClose={vi.fn()} onConfirm={vi.fn()} isPending />);

    expect(save().textContent).toBe("Зберігаємо…");
    expect(save().disabled).toBe(true);
    expect(input().value).toBe("5");
  });
});
