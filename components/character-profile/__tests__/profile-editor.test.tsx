// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BiographyEditor } from "@/components/character-profile/BiographyEditor";
import { LevelUpAction } from "@/components/character-profile/LevelUpAction";
import { PrimaryAbilityPicker } from "@/components/characters/stats/PrimaryAbilityPicker";

describe("редактор ДМа", () => {
  afterEach(cleanup);

  it("Маркер обгортає виділене", () => {
    const onChange = vi.fn();

    render(<BiographyEditor value="мати загинула тут" onChange={onChange} />);

    const area = screen.getByRole("textbox", { name: "Біографія" }) as HTMLTextAreaElement;

    area.setSelectionRange(0, 13);
    fireEvent.click(screen.getByRole("button", { name: "Маркер" }));
    expect(onChange).toHaveBeenCalledWith("==мати загинула== тут");
  });

  it("«+ рівень» немає на maxLevel і є нижче", () => {
    const { rerender } = render(<LevelUpAction level={20} maxLevel={20} onLevelUp={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "+ рівень" })).toBeNull();
    rerender(<LevelUpAction level={19} maxLevel={20} onLevelUp={vi.fn()} />);
    expect(screen.getByRole("button", { name: "+ рівень" })).toBeTruthy();
  });

  it("основна характеристика — одна; повторний клік знімає", () => {
    const onChange = vi.fn();

    const { rerender } = render(<PrimaryAbilityPicker value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Спритність — основна" }));
    expect(onChange).toHaveBeenLastCalledWith("dexterity");
    rerender(<PrimaryAbilityPicker value="dexterity" onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Спритність — основна" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
