// @vitest-environment happy-dom
import { API_ERRORS } from "@/lib/constants/api-errors";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattlePreparationView } from "@/components/battle/overlays/BattlePreparationView";

afterEach(cleanup);

describe("BattlePreparationView: старт", () => {
  it("без учасників на полі кнопка вимкнена з підказкою", () => {
    const onStart = vi.fn();

    render(<BattlePreparationView alliesCount={1} enemiesCount={1} isDM onStartBattle={onStart} isStarting={false} canStart={false} />);

    const button = screen.getByRole("button", { name: "ДО БОЮ!" }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(screen.getByText(API_ERRORS.BATTLE_ONE_ON_FIELD)).toBeTruthy();
  });

  it("за наявності учасників на полі старт працює", () => {
    const onStart = vi.fn();

    render(<BattlePreparationView alliesCount={1} enemiesCount={1} isDM onStartBattle={onStart} isStarting={false} />);
    fireEvent.click(screen.getByRole("button", { name: "ДО БОЮ!" }));
    expect(onStart).toHaveBeenCalled();
  });
});
