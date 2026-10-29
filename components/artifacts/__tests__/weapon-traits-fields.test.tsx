// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactWeaponFields } from "@/components/artifacts/ArtifactWeaponFields";

describe("ArtifactWeaponFields traits", () => {
  afterEach(cleanup);

  it("чекбокс додає трейт", () => {
    const onChange = vi.fn();

    render(<ArtifactWeaponFields value={{ damageDice: "1d8" }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "gameTerms.weaponTraits.traits.finesse" }));

    expect(onChange).toHaveBeenCalledWith({ damageDice: "1d8", traits: ["finesse"] });
  });

  it("зняття останнього трейта прибирає поле", () => {
    const onChange = vi.fn();

    render(<ArtifactWeaponFields value={{ traits: ["light"] }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "gameTerms.weaponTraits.traits.light" }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("кубик двома руками лише для універсальної", () => {
    const { rerender } = render(<ArtifactWeaponFields value={{}} onChange={vi.fn()} />);

    expect(screen.queryByLabelText("gameTerms.weaponTraits.versatileDice")).toBeNull();

    rerender(<ArtifactWeaponFields value={{ traits: ["versatile"] }} onChange={vi.fn()} />);

    expect(screen.getByLabelText("gameTerms.weaponTraits.versatileDice")).toBeTruthy();
  });
});
